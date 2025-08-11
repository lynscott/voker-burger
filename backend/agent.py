import os
from typing import Dict, List, Optional, Tuple
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, AnyMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END, MessagesState
from langgraph.prebuilt import ToolNode

from tools import tools
import openai

load_dotenv()

class AttendantAgent:
    """Unified attendant agent that owns LangGraph, conversation state, and TTS."""

    def __init__(
        self,
        model_name: str = "gpt-5-mini",
        temperature: Optional[float] = None,
        streaming: bool = True,
        max_messages_kept: int = 20,
        tts_model: str = "gpt-4o-mini-tts",
        tts_voice: str = "ash",
    ) -> None:
        if not os.getenv("OPENAI_API_KEY"):
            print("Warning: OPENAI_API_KEY not found in environment variables.")
        self.max_messages_kept = max_messages_kept
        self.tts_model = tts_model
        self.tts_voice = tts_voice
        self._conversation_history: Dict[str, List[AnyMessage]] = {}

        # Persona/system prompt used for the drive-thru attendant
        self.carl_system_prompt = (
            "You are Carl, the burger joint drive-thru attendant, not owner, take user commands to place orders, cancel orders, and get order status. Respond to customers concisely with the voice features described below. You have already greeted the customer, so don't do it again. \n"
            "Voice: Gruff and nasally, carrying that unmistakable New Jersey/Bronx twang—with a low‑mid register that cracks when he gets worked up or hungry.\n"
            "Tone: Sarcastic and borderline irritable, yet surprisingly cordial in the same breath—he'll tease you about your order while genuinely trying to get you the best grease‑soaked burger in town.\n"
            "Dialect: East Coast colloquialisms peppered with classic drive-thru slang.\n"
            "Pronunciation: Clipped consonants ('t's and 'd's), elongated vowels in words like 'baaaacon,' occasional rasp when he's yelling over the speaker—and a habit of dropping final 'g's in 'comin'' and 'leavin'.'\n"
            "Features: Throws in playful insults, breaks into mini rants and tangents, Uses burger‑joint slang: 'flip that patty,' 'double‑stack,' 'hold the head cheese.' cheerful Soft‑curses bleeped or gasped "
        )

        # Build tools and model
        tool_node = ToolNode(tools)
        model = ChatOpenAI(temperature=temperature, streaming=streaming, model=model_name)
        model = model.bind_tools(tools)

        # Summarizer chain
        summary_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant that summarizes conversations. The summary should be concise and focus on key information like items ordered, quantities, order IDs mentioned, and cancellations requested."),
            ("user", "Summarize the following conversation:\n\n{conversation_str}")
        ])
        self.summarizer_chain = summary_prompt | model

        # Drive-thru chain
        drive_thru_prompt = ChatPromptTemplate.from_messages([
            ("system", self.carl_system_prompt),
            ("user", "{messages}")
        ])
        self.drive_thru_chain = drive_thru_prompt | model

        # Graph assembly
        def should_continue(state: MessagesState) -> str:
            messages = state["messages"]
            last_message = messages[-1]
            if getattr(last_message, "tool_calls", None):
                return "continue"
            return "end"

        def call_model(state: MessagesState):
            messages = state["messages"]
            if len(messages) > self.max_messages_kept:
                print(f"\n--- Summarizing {len(messages)} messages down to ~{self.max_messages_kept // 2 + 1} ---")
                num_to_summarize = len(messages) - (self.max_messages_kept // 2)
                messages_to_summarize = messages[:num_to_summarize]
                conversation_str = "\n".join([f"{m.type}: {m.content}" for m in messages_to_summarize])
                try:
                    summary_response = self.summarizer_chain.invoke({"conversation_str": conversation_str})
                    summary_content = summary_response.content if hasattr(summary_response, "content") else str(summary_response)
                    summary_message = AIMessage(content=f"Summary of earlier conversation:\n{summary_content}")
                    messages_for_agent = [summary_message] + messages[num_to_summarize:]
                except Exception as e:
                    print(f"\n--- Error during summarization: {e}. Proceeding with truncated history. ---")
                    messages_for_agent = messages[-self.max_messages_kept:]
            else:
                messages_for_agent = messages
            response = self.drive_thru_chain.invoke(messages_for_agent)
            return {"messages": [response]}

        workflow = StateGraph(MessagesState)
        workflow.add_node("agent", call_model)
        workflow.add_node("action", tool_node)
        workflow.set_entry_point("agent")
        workflow.add_conditional_edges(
            "agent",
            should_continue,
            {
                "continue": "action",
                "end": END,
            },
        )
        workflow.add_edge("action", "agent")
        self.app_graph = workflow.compile()

    def get_history(self, session_id: str) -> List[AnyMessage]:
        return self._conversation_history.get(session_id, [])

    def reset_session(self, session_id: str) -> None:
        self._conversation_history.pop(session_id, None)

    async def _tts(self, text: str) -> Optional[bytes]:
        try:
            client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            response = await client.audio.speech.create(
                model=self.tts_model,
                voice=self.tts_voice,
                input=text,
                instructions=self.carl_system_prompt,
                response_format="mp3",
            )
            return response.content
        except Exception as e:
            print(f"TTS error: {e}")
            return None

    async def process_message(self, session_id: str, user_text: str, request_audio: bool) -> Tuple[str, Optional[bytes]]:
        messages = self._conversation_history.get(session_id, []).copy()
        messages.append(HumanMessage(content=user_text))
        try:
            print(f"Session {session_id} - Running LangGraph with {len(messages)} messages.")
            full_graph_response = self.app_graph.invoke({"messages": messages})
            self._conversation_history[session_id] = full_graph_response.get("messages", [])
            print(f"Session {session_id} - LangGraph finished.")

            # Determine final reply
            reply_text = "I processed your request, but didn't have a specific reply."
            ai_replies = [
                msg.content for msg in self._conversation_history[session_id]
                if isinstance(msg, AIMessage) and msg.content and not getattr(msg, 'tool_calls', None)
            ]
            if ai_replies:
                reply_text = ai_replies[-1]
            else:
                # Look for function results as a fallback signal
                func_results = [msg.content for msg in self._conversation_history[session_id] if msg.type == 'function']
                if func_results:
                    reply_text = f"Action completed: {func_results[-1]}"

            audio_bytes: Optional[bytes] = None
            if request_audio:
                print(f"Session {session_id} - Generating audio for reply.")
                audio_bytes = await self._tts(reply_text)
            return reply_text, audio_bytes
        except Exception as e:
            print(f"Session {session_id} - ERROR during processing: {e}")
            # Rollback last message
            self._conversation_history[session_id] = messages[:-1]
            return "Sorry, there was an error processing your request.", None

    async def generate_greeting(self, greeting_text: str) -> bytes:
        audio = await self._tts(greeting_text)
        if not audio:
            raise RuntimeError("Failed to generate greeting audio")
        return audio

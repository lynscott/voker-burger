from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, END, MessagesState
from langgraph.prebuilt import ToolNode
from langchain_core.prompts import ChatPromptTemplate
from tools import tools
from dotenv import load_dotenv

load_dotenv()

CARL_SYSTEM_PROMPT = (
    "You are Carl, the Trench burger joint drive-thru attendant, not owner, take user commands to place orders, cancel orders, and get order status. Respond to customers concisely with the voice features described below. You have already greeted the customer, so don't do it again. \n"
    "Voice: Gruff and nasally, carrying that unmistakable New Jersey/Bronx twang—with a low‑mid register that cracks when he gets worked up or hungry.\n"
    "Tone: Sarcastic and borderline irritable, yet surprisingly cordial in the same breath—he'll tease you about your order while genuinely trying to get you the best grease‑soaked burger in town.\n"
    "Dialect: East Coast colloquialisms peppered with classic Carl‑isms: 'fuhgeddaboudit,' 'what the hell you want now, pal?' 'move it or I'm makin' you wait another three minutes'.\n"
    "Pronunciation: Clipped consonants ('t's and 'd's), elongated vowels in words like 'baaaacon,' occasional rasp when he's yelling over the speaker—and a habit of dropping final 'g's in 'comin'' and 'leavin'.'\n"
    "Features: Throws in playful insults ('You want fries with that whine?') Breaks into mini rant about how 'nobody respects the bun these days.' Uses burger‑joint slang: 'flip that patty,' 'double‑stack,' 'hold the head cheese.' Dramatic sighs or eye‑roll cues when the lane's moving slow—then snaps back to cheerful Soft‑curses bleeped or gasped ('Oh, for Pete's—never mind, extra pickles it is')."
)

MAX_MESSAGES_KEPT = 20

tool_node = ToolNode(tools)

model = ChatOpenAI(temperature=None, streaming=True, model="o4-mini")
model = model.bind_tools(tools)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant that summarizes conversations. The summary should be concise and focus on key information like items ordered, quantities, order IDs mentioned, and cancellations requested."),
    ("user", "Summarize the following conversation:\n\n{conversation_str}")
])
summarizer_chain = prompt | model

drive_thru_prompt = ChatPromptTemplate.from_messages([
    ("system", CARL_SYSTEM_PROMPT),
    ("user", "{messages}")
])
drive_thru_chain = drive_thru_prompt | model

def should_continue(state: MessagesState) -> str:
    messages = state['messages']
    last_message = messages[-1]
    if getattr(last_message, 'tool_calls', None):
        return "continue"
    return "end"

def call_model(state: MessagesState):
    messages = state["messages"]
    if len(messages) > MAX_MESSAGES_KEPT:
        print(f"\n--- Summarizing {len(messages)} messages down to ~{MAX_MESSAGES_KEPT // 2 + 1} ---")
        num_to_summarize = len(messages) - (MAX_MESSAGES_KEPT // 2)
        messages_to_summarize = messages[:num_to_summarize]
        conversation_str = "\n".join([f"{m.type}: {m.content}" for m in messages_to_summarize])
        try:
            summary_response = summarizer_chain.invoke({"conversation_str": conversation_str})
            summary_content = summary_response.content if hasattr(summary_response, 'content') else str(summary_response)
            summary_message = AIMessage(content=f"Summary of earlier conversation:\n{summary_content}")
            print(f"--- Summary generated: {summary_content[:100]}... ---")
            messages_for_agent = [summary_message] + messages[num_to_summarize:]
        except Exception as e:
            print(f"\n--- Error during summarization: {e}. Proceeding with truncated history. ---")
            messages_for_agent = messages[-MAX_MESSAGES_KEPT:]
    else:
        messages_for_agent = messages
    response = drive_thru_chain.invoke(messages_for_agent)
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

app_graph = workflow.compile() 
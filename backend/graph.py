from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, END, MessagesState
from langgraph.prebuilt import ToolNode
from langchain_core.prompts import ChatPromptTemplate
from tools import tools
from dotenv import load_dotenv

load_dotenv()


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
    ("system", "You are a helpful drive-thru attendant that takes users commands to place orders, cancel orders, and get the status of current orders. Do your best to understand the users orders and requests but ask for clarification if needed."),
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
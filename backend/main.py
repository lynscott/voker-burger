import os
from typing import List, Dict
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import time
from fastapi.responses import StreamingResponse
import openai
import base64
from langchain_core.messages import AnyMessage, FunctionMessage, HumanMessage, AIMessage
from order_service import create_db_and_tables, get_orders
from tools import Order, OrderStatus, MENU
from graph import app_graph


load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    print("Warning: OPENAI_API_KEY not found in environment variables.")

create_db_and_tables()

RATE_LIMIT_DURATION = 60
RATE_LIMIT_REQUESTS = 60
client_request_counts: Dict[str, List[float]] = {}

app = FastAPI(title="Trench Burger AI Assistant", version="1.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request/Response Models (FastAPI uses Pydantic V2 implicitly) ---
from pydantic import BaseModel
class ChatRequest(BaseModel):
    message: str
    request_audio: bool = False

class ChatResponse(BaseModel):
    reply: str

class ChatAudioResponse(BaseModel):
    reply: str
    audio: str

class OrderResponse(BaseModel):
    orders: List[Order]
    totals: Dict[str, int]

# --- API Endpoints and Middleware ---
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    if client_ip in client_request_counts:
        client_request_counts[client_ip] = [
            ts for ts in client_request_counts[client_ip] if now - ts < RATE_LIMIT_DURATION
        ]
    if client_ip in client_request_counts and len(client_request_counts[client_ip]) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
    client_request_counts.setdefault(client_ip, []).append(now)
    response = await call_next(request)
    return response

conversation_history: Dict[str, List[AnyMessage]] = {}
DEFAULT_SESSION_ID = "voker_session"

CARL_SYSTEM_PROMPT = (
    "You are Carl, the Trench burger joint drive-thru attendant.\n"
    "Voice: Gruff and nasally, carrying that unmistakable New Jersey/Bronx twang—with a low‑mid register that cracks when he gets worked up or hungry.\n"
    "Tone: Sarcastic and borderline irritable, yet surprisingly cordial in the same breath—he'll tease you about your order while genuinely trying to get you the best grease‑soaked burger in town.\n"
    "Dialect: East Coast colloquialisms peppered with classic Carl‑isms: 'fuhgeddaboudit,' 'what the hell you want now, pal?' 'move it or I'm makin' you wait another three minutes'.\n"
    "Pronunciation: Clipped consonants ('t's and 'd's), elongated vowels in words like 'baaaacon,' occasional rasp when he's yelling over the speaker—and a habit of dropping final 'g's in 'comin'' and 'leavin'.'\n"
    "Features: Throws in playful insults ('You want fries with that whine?') and Breaks into mini rant about how 'nobody respects the bun these days.' Uses burger‑joint slang: 'flip that patty,' 'double‑stack,' 'hold the head cheese.' Dramatic sighs or eye‑roll cues when the lane's moving slow—then snaps back to cheerful. Soft‑curses bleeped or gasped ('Oh, for Pete's—never mind, extra pickles it is')."
)

INITIAL_GREETING_MESSAGE = "__INITIAL_GREETING__"
GREETING_TEXT = "Welcome to Trench burger home of the lotus burger, my name is Carl, whaddya want?"

async def generate_agent_speech(text: str):
    try:
        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = await client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice="ash",
            input=text,
            instructions=CARL_SYSTEM_PROMPT,
            response_format="mp3"
        )
        audio_bytes = response.content
        return audio_bytes
    except Exception as e:
        print(f"Error generating agent speech: {e}")
        return None

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    user_message = request.message
    wants_audio = request.request_audio
    session_id = DEFAULT_SESSION_ID
    if user_message == INITIAL_GREETING_MESSAGE:
        print(f"Session {session_id} - Generating initial greeting audio (streaming).")
        try:
            client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            response = await client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice="ash",
                input=GREETING_TEXT,
                instructions=CARL_SYSTEM_PROMPT,
                response_format="mp3"
            )
            audio_bytes = response.content
            return StreamingResponse(iter([audio_bytes]), media_type="audio/mpeg")
        except Exception as e:
            print(f"Error generating greeting audio: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate greeting audio.")
    messages = conversation_history.get(session_id, [])
    messages.append(HumanMessage(content=user_message))
    final_reply_text = "Sorry, I encountered an issue and couldn't process your request."
    for attempt in range(2):
        try:
            inputs = {"messages": messages}
            print(f"Session {session_id} - Running LangGraph with {len(messages)} messages.")
            full_graph_response = app_graph.invoke(inputs)
            conversation_history[session_id] = full_graph_response.get("messages", [])
            print(f"Session {session_id} - LangGraph finished.")
            ai_replies = [
                msg.content for msg in conversation_history[session_id]
                if isinstance(msg, AIMessage) and msg.content and not getattr(msg, 'tool_calls', None)
            ]
            if ai_replies:
                final_reply_text = ai_replies[-1]
            else:
                func_results = [
                    msg.content for msg in conversation_history[session_id] if isinstance(msg, FunctionMessage)
                ]
                if func_results:
                    final_reply_text = f"Action completed: {func_results[-1]}"
                else:
                    final_reply_text = "I processed your request, but didn't have a specific reply."
            if wants_audio:
                print(f"Session {session_id} - Generating audio for reply.")
                audio_bytes = await generate_agent_speech(final_reply_text)
                if audio_bytes:
                    audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    print(f"Session {session_id} - Sending JSON response with text and base64 audio ({len(audio_base64)} chars).")
                    return ChatAudioResponse(reply=final_reply_text, audio=audio_base64)
                else:
                    print(f"Session {session_id} - WARNING: Audio generation failed, falling back to text-only JSON.")
                    return ChatResponse(reply=final_reply_text)
            else:
                print(f"Session {session_id} - Sending text-only JSON response.")
                return ChatResponse(reply=final_reply_text)
        except Exception as e:
            print(f"Session {session_id} - ERROR during LangGraph processing (Attempt {attempt + 1}): {e}")
            conversation_history[session_id] = messages[:-1]
            final_reply_text = f"Sorry, there was an error processing your request (Attempt {attempt + 1})."
    print(f"Session {session_id} - ERROR: All retries failed for user message: {user_message}")
    raise HTTPException(status_code=500, detail=final_reply_text)

@app.get("/orders", response_model=OrderResponse)
async def get_orders_endpoint():
    try:
        orders = get_orders()
        totals = {item: 0 for item in MENU}
        for order in orders:
            if order.status == OrderStatus.PLACED and order.details:
                for detail in order.details:
                    item = detail.get("item")
                    qty = detail.get("qty", 0)
                    if item in totals:
                        totals[item] += qty
        return OrderResponse(orders=orders, totals=totals)
    except Exception as e:
        print(f"Error in /orders endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve order data.")

import os
from typing import List, Dict
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import time
from fastapi.responses import StreamingResponse
from langchain_core.messages import AnyMessage
from order_service import create_db_and_tables, get_orders
from tools import Order, OrderStatus, MENU
from agent import AttendantAgent
import base64

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

# Request/Response Models
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

# Agent instance
agent = AttendantAgent()
DEFAULT_SESSION_ID = "bada_bing_session"
INITIAL_GREETING_MESSAGE = "__INITIAL_GREETING__"
GREETING_TEXT = "Welcome to Bada Bing Burger, my name is Carl, whaddya want?"

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

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    session_id = DEFAULT_SESSION_ID
    if request.message == INITIAL_GREETING_MESSAGE:
        try:
            audio_bytes = await agent.generate_greeting(GREETING_TEXT)
            return StreamingResponse(iter([audio_bytes]), media_type="audio/mpeg")
        except Exception as e:
            print(f"Error generating greeting audio: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate greeting audio.")

    reply_text, audio_bytes = await agent.process_message(session_id, request.message, request.request_audio)
    if request.request_audio and audio_bytes:
        return ChatAudioResponse(reply=reply_text, audio=base64.b64encode(audio_bytes).decode("utf-8"))
    return ChatResponse(reply=reply_text)

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

## Backend (FastAPI)

### Overview

This service powers the AI drive‑thru. It exposes:
- `POST /chat` Chat with the drive‑thru attendant. Optional audio reply.
- `GET /orders` Retrieve stored orders plus per‑item totals.

### Key Files

- `main.py`
  - FastAPI app setup, CORS, and basic rate limiting
  - Pydantic models for requests/responses
  - Endpoints that call into the attendant and order service
- `agent.py`
  - `AttendantAgent` class encapsulating:
    - LangGraph workflow (agent → tools loop, conditional continue)
    - Conversation history, summarization, and reply selection
    - OpenAI TTS integration for greeting and replies
- `tools.py`
  - LangChain tools the agent can call:
    - `place_order_tool`, `cancel_order_tool`, `get_current_orders_tool`
  - Input models and the `MENU` definition
- `order_service.py`
  - SQLModel models and functions to create DB, place/cancel/fetch orders

### How the Drive‑Thru Attendant Works

1) User sends text (or voice → text) to `POST /chat`.
2) `main.py` delegates to `AttendantAgent.process_message(session_id, text, request_audio)`.
3) `AttendantAgent` maintains a per‑session history and runs a LangGraph workflow:
   - The agent model (OpenAI Chat) produces an assistant message and optional tool calls
   - If there are tool calls, a `ToolNode` executes the corresponding Python tools in `tools.py`
   - The result is fed back to the agent until no further tool calls are requested
4) The final assistant reply text is returned. If `request_audio` is true, the agent also requests TTS via OpenAI (`gpt-4o-mini-tts`) and returns raw MP3 bytes.
5) `main.py` encodes audio replies as base64 when returning JSON; greeting audio is streamed as `audio/mpeg` for the special greeting trigger.

Greeting flow:
- Frontend sends a special `"__INITIAL_GREETING__"` message.
- `main.py` calls `AttendantAgent.generate_greeting()` which uses the same TTS path.
- The audio is streamed so the user hears it immediately, then the mic turns on.

### Setup

Requirements: Python 3.11+ (pyenv recommended), Poetry

```bash
cd backend
poetry install --no-root

# Root .env must contain (see /.env.example)
# OPENAI_API_KEY=sk-...

poetry run uvicorn main:app --reload --host 0.0.0.0
```

API docs: http://localhost:8000/docs

### Notes
- SQLite file is ignored via `.gitignore` (`orders.db*`)
- Environment files `.env*` are ignored
- Rate limits are minimal (60 req/min/IP) and only for local dev

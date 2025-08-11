## AI Drive‑Thru Application

A modern AI-powered drive‑thru built with FastAPI (Python) and React + Vite (TypeScript). The system supports text and optional voice interactions to place, cancel, and review food orders.

### Project Structure

- `backend/` FastAPI service
  - `main.py` API entrypoint and endpoints (`/chat`, `/orders`)
  - `agent.py` unified LangGraph‑based attendant (`AttendantAgent`) and OpenAI TTS
  - `tools.py` LangChain tools for placing/canceling/listing orders and `MENU`
  - `order_service.py` SQLite/SQLModel order persistence
- `frontend/` React + Vite app
  - `src/components/*` UI components (chat, orders board, stats, header)
  - `src/context/VoiceContext.tsx` voice state and flow control
  - `src/services/audioService.ts` Web Speech + Web Audio glue
  - `src/api/*` typed API clients

### Quickstart

Recommended: Docker (single container)
- Requirements: Docker Desktop (macOS/Windows) or Docker Engine + a running daemon
- Steps:
  1) Create `.env` at repo root (see `.env.example`):
     - `OPENAI_API_KEY=sk-...`
  2) Using the Makefile helpers:
     - `make docker-up` → builds and runs the container on port 8000
     - `make docker-logs` → tails logs, `make docker-down` → stop/remove
  3) Open `http://localhost:8000` (frontend) and `http://localhost:8000/docs` (API)

Manual Docker (alternative):
```bash
docker build -t drive-thru .
docker run --env-file .env -p 8000:8000 drive-thru
```

Local development (separate FE/BE)
- Requirements:
  - Backend: Python 3.11+, Poetry, OpenAI API key in root `.env`
  - Frontend: Node 20+, npm
- Backend:
```bash
cd backend
poetry install --no-root
poetry run uvicorn main:app --reload --host 0.0.0.0
```
- Frontend:
```bash
cd frontend
npm install
npm run dev -- --host
```

Open: `http://localhost:5173` (frontend) and `http://localhost:8000/docs` (API).

### Key Features

- AI attendant powered by LangGraph + OpenAI Chat
- Order placement, cancellation, and dashboard totals
- Optional voice mode with greeting TTS, continuous listening, and audio replies
- Tailwind CSS v4 theme, subtle motion, toast feedback, and listening indicator

### More Details

- See `backend/README.md` for backend architecture and the drive‑thru agent internals
- See `frontend/README.md` for frontend architecture and voice UX flow

### Usage

You can interact via text or enable voice mode (Order Speaker) for hands‑free use.

- Place an order
  - Text: “I’d like 2 burgers and 1 fries.”
  - Voice: Toggle Order Speaker, wait for the greeting, then say your order.

- Cancel an order
  - Text: “Cancel order 12.”
  - Voice: “Cancel order number twelve.”

- Check current orders / totals
  - Text: “What are the current orders?” or “How many fries are active?”
  - Voice: “What’s on the board right now?”

Tips
- Speak naturally; items supported are burger, fries, and drink.
- Keep the browser tab focused for mic permissions and audio.
- If audio fails, the app will continue in text mode and show a toast.


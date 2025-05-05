# Instructions

Create a mock drive thru ordering system that allows users to place and cancel their orders using AI.

![Example UI](./image.png)

For this project, assume the order item options are either 1) burgers, 2) fries, or 3) drinks. 

These are examples of user inputs and the corresponding actions to take:
* "I would like to order a burger" -> order of 1 burger
* "My friend and I would each like a fries and a drink" -> order for 2 fries, 2 drinks
* "Please cancel my order, order #2" -> cancel order #2

You will need an LLM to figure out the actions, you cant just search the text for keywords in general. You can assume every user input is either for an order and includes the items to order, or a cancellation with the order number to cancel, but the exact text and structure of the sentences could vary.

# Setup

See backend/README.md and frontend/README.md for setup instructions

# Criteria

1. Create a UI in Svelte that shows the total number of items that have been ordered, a list of placed orders and has a single text box for new user requests
2. Implement a backend using FastAPI that uses OpenAI's function calling to allow users to place or cancel their orders
3. Orders can contain one or multiple items and 1 or multiple quantities of each item
4. Placing or cancelling orders should be reflected in the UI

# Other Considerations

Please think through and be able to talk about the following considerations:

* validating user inputs
* multi-tenant access
* extensibility for example, new functions being added
* testing and reliability

# Voker Burger Project

<details>
<summary>A modern AI-powered drive-thru experience built with FastAPI and SvelteKit.</summary>

## Project Overview

This project simulates an AI-driven drive-thru system for "Voker Burger". Users can interact with the system via text or voice (optional) to place, cancel, or inquire about food orders. The backend uses LangGraph to manage the conversation flow and OpenAI to understand user requests and interact with an order management system. The frontend provides a modern, reactive UI for the drive-thru interaction and an order tracking dashboard.

## Project Structure

-   **`frontend/`**: SvelteKit application providing the user interface.
    -   Uses TailwindCSS and shadcn-ui for styling.
    -   Contains components for chat interaction, order display, and stats.
    -   Includes `src/lib/services/audioService.ts` for voice interaction capabilities.
-   **`backend/`**: FastAPI server handling the core logic.
    -   `main.py`: Sets up the FastAPI application, defines API endpoints (`/chat`, `/orders`), handles request/response models, and manages middleware (CORS, rate limiting).
    -   `graph.py`: Defines the LangGraph conversational agent, including the model (OpenAI), prompts, state management, nodes (agent logic, tool execution), and conversation summarization logic. Exports the compiled `app_graph`.
    -   `tools.py`: Defines the tools available to the LangGraph agent (e.g., `place_order_tool`, `cancel_order_tool`, `get_current_orders_tool`) using LangChain's `@tool` decorator and Pydantic models for input validation. Interfaces with the `order_service`.
    -   `order_service.py`: Manages the order data (create, cancel, retrieve orders) using SQLModel and an SQLite database (`orders.db`).
    -   `orders.db`: SQLite database file storing order information.

## Core Features

-   🍔 **AI-Powered Ordering**: Uses natural language processing (via LangGraph and OpenAI) to understand and process food orders.
-   🛒 **Order Management**: Allows users to place new orders, cancel existing ones, and view current active orders.
-   📊 **Real-time Dashboard**: The frontend displays active orders and summary statistics dynamically.
-   🎨 **Modern UI**: Drive-thru themed interface built with SvelteKit and modern UI components.
-   🗣️ **(Optional) Voice Interaction**: Supports voice input (speech-to-text) and synthesized voice output (text-to-speech).

## Running the Application

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies using Poetry
poetry install

# Ensure you have a .env file with your OPENAI_API_KEY
# Example .env:
# OPENAI_API_KEY=sk-your_api_key_here

# Run the FastAPI server with hot-reload
poetry run uvicorn main:app --reload --host 0.0.0.0
```

The backend server will be available at `http://localhost:8000`.
API documentation (Swagger UI) is automatically available at `http://localhost:8000/docs`.

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev -- --host
```

The frontend application will be available at `http://localhost:5173`.

## Audio Interaction (Optional)
### Use Safari or Chrome for best results

The application includes features for voice-based interaction, primarily managed by the frontend:

1.  **Speech Recognition (Speech-to-Text)**
    -   Leverages the browser's native Web Speech API (`SpeechRecognition`).
    -   The `frontend/src/lib/services/audioService.ts` handles microphone permission requests, starting/stopping listening, and processing transcription results.
    -   Transcribed text is sent to the backend `/chat` endpoint like regular text input.
    -   Includes handling for various API states (listening, interim results, final results, errors).

2.  **Synthesized Voice Output (Text-to-Speech)**
    -   The backend `/chat` endpoint can optionally generate MP3 audio for the AI's reply using OpenAI's TTS API (`gpt-4o-mini-tts`).
    -   The `request_audio: true` flag in the `/chat` request payload triggers audio generation.
    -   The backend returns the audio as a base64-encoded string within the JSON response (`ChatAudioResponse`).
    -   The frontend (`audioService.ts` or component logic) decodes and plays this audio using a standard HTML `<audio>` element or the Web Audio API.
    -   A specific voice persona ("Carl") is configured in the backend (`main.py`) via instructions passed to the TTS API.

## Technologies Used

-   **Backend:** FastAPI, LangGraph, LangChain, OpenAI API (Chat & TTS), SQLModel, Poetry
-   **Frontend:** SvelteKit, TypeScript, TailwindCSS, shadcn-ui, Web Speech API
-   **Data Storage:** SQLite

</details>


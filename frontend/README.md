## Frontend (React + Vite + TypeScript)

### Overview

Drive‑thru UI with chat, order board, stats, and optional voice interaction. Built with React 18, Vite, Tailwind v4, and Framer Motion.

### Structure

- `src/App.tsx` layout shell
- `src/components/`
  - `DriveThruIntercom.tsx` chat UI with smooth scroll, typing indicator, audio replies, voice toggle, listening badge
  - `OrderBoard.tsx`, `OrderTicket.tsx`, `StatsCounter.tsx`, `Header.tsx`
  - `Panel.tsx` reusable bordered surface
- `src/context/VoiceContext.tsx` manages voice mode, listening/playback state, transcripts
- `src/services/audioService.ts` Web Audio + Web Speech helpers
- `src/api/` client modules for `/chat` and `/orders`
- `src/index.css` Tailwind v4 @import and theme styles
- `postcss.config.js` uses `@tailwindcss/postcss` and `autoprefixer`
- `tailwind.config.ts` content globs and theme

### Scripts

```bash
npm install
npm run dev -- --host
npm run build
```

### Voice UX Flow

- Toggle “Order Speaker” to enable voice mode
- Greeting audio plays, then mic activates automatically
- While listening: interim transcript mirrors in the input; final transcript auto‑sends
- Assistant replies with text and optional audio; after audio finishes, listening resumes
- If audio fails, a toast appears and we continue in text mode

### Accessibility & Feedback

- Always‑visible timestamps in chat bubbles
- Typing indicator during processing
- Toasts for errors and audio fallbacks
- Visual listening indicator next to the speaker toggle; waveform animates while listening/sending/playing

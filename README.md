# ScreenFlow AI Studio

Multi-user video teaching platform with AI-powered features. Built with React, WebRTC, Socket.IO, and Node.js.

## Features

- **Multi-user video meetings** — WebRTC Mesh P2P (up to 4 participants)
- **Solo recording** — Screen/camera/both recording with real-time AI assistance
- **Real-time chat** — Text messaging during meetings
- **AI speech analysis** — Performance metrics and follow-up questions
- **Responsive design** — Desktop, tablet, and mobile support
- **Dark/Light theme** — Persistent theme preference

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Socket.IO Client, React Router v7

**Backend:** Node.js, Express 5, Socket.IO, Prisma ORM, SQLite, JWT auth, bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
cd server && npm install && npx prisma db push && cd ..
```

### Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and add your OpenRouter API key (optional, for AI features)
```

Server config is in `server/.env` (JWT secret, API key, etc.)

### Run development

```bash
npm start
```

This starts both the frontend (Vite on port 5173) and backend (Express on port 4000) concurrently.

### Build for production

```bash
npm run build
```

## Project Structure

```
screenflow-ai-studio/
├── src/                    # Frontend source
│   ├── pages/              # Route pages (Home, MeetingRoom, Record, Settings)
│   ├── components/         # UI and meeting components
│   ├── hooks/              # Custom hooks (WebRTC, recording, speech, etc.)
│   ├── stores/             # Zustand state stores
│   ├── services/           # API client and Socket.IO client
│   ├── lib/                # Utility functions
│   └── types/              # TypeScript type definitions
├── server/                 # Backend source
│   ├── src/
│   │   ├── routes/         # REST API (auth, rooms, AI)
│   │   ├── services/       # Business logic (AI service)
│   │   ├── socket/         # Socket.IO event handlers
│   │   └── middleware/     # Auth middleware
│   └── prisma/             # Database schema
├── vite.config.ts
└── tsconfig.json
```

## Keyboard Shortcuts (Recording Mode)

| Shortcut | Action |
|----------|--------|
| `Ctrl + R` | Start/Stop Recording |
| `Ctrl + D` | Download Video |
| `Ctrl + 1` | Switch to Screen |
| `Ctrl + 2` | Switch to Camera |
| `Ctrl + 3` | Switch to Screen + Mic |

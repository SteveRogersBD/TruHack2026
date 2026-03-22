# Axon — AI Adaptive Learning Workspace

> An AI-powered tutor with a 3D avatar that teaches through live conversation, visual canvas explanations, and an embedded code editor.

![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![AI](https://img.shields.io/badge/AI-GPT--4o%20%2F%20Gemini-blueviolet)
![3D](https://img.shields.io/badge/3D-React%20Three%20Fiber-orange)
![DB](https://img.shields.io/badge/DB-PostgreSQL%20%2F%20SQLite-336791?logo=postgresql)

---

## Table of Contents

- [Inspiration](#inspiration)
- [What it does](#what-it-does)
- [How we built it](#how-we-built-it)
- [Architecture](#architecture)
- [ER Diagram](#er-diagram)
- [API Reference](#api-reference)
- [Agent Pipeline](#agent-pipeline)
- [Installation](#installation)
- [Project Structure](#project-structure)

---

## Inspiration

Most learning tools feel like search engines with a chat box bolted on. You type a question, get a wall of text, and you're left to figure out the rest yourself. We wanted to flip that — what if your tutor could *show* you, not just tell you? What if it felt less like Googling and more like sitting across from someone who genuinely adapts to how you learn?

That question became Axon.

---

## What it does

Axon is an adaptive AI learning workspace with a 3D avatar tutor that teaches through live conversation, visual canvas explanations, and an embedded code editor.

- **3D Avatar Tutor** — A Ready Player Me avatar that reacts in real time: speaking, thinking, listening, and encouraging based on session context
- **Visual Canvas** — Step-by-step animated explanations (diagrams, flowcharts, algorithm visualizations) rendered as the tutor speaks
- **Live IDE** — Write, run, and get instant AI feedback on code without leaving the workspace
- **Persistent Sessions** — Every conversation, canvas state, and code snippet is saved so learning continues across sessions
- **Suggestion Chips** — Contextual follow-up prompts generated after every response so you always know what to explore next
- **Step Tracker** — A live progress tracker in the avatar sidebar that reflects exactly where you are in a lesson

---

## How we built it

**Frontend** — React + Vite, React Three Fiber (`@react-three/fiber` + `@react-three/drei`) for the 3D avatar, Zustand for global state, Lucide React for icons, Tailwind CSS for utilities. The UI follows a Modern Dark Cinema design system: ambient light blobs, glassmorphism overlays, expo-out easing (`cubic-bezier(0.16,1,0.3,1)`), and a floating four-zone panel layout.

**Backend** — FastAPI with a LangGraph agentic loop. The agent uses a router node (gpt-4o-mini) to classify intent, then dispatches to a tutor node (gpt-4o / Gemini 1.5 Flash) that produces a fully structured JSON response on every turn — speech text, emotion state, canvas actions, step updates, and follow-up suggestions — all in one round trip.

**Avatar** — Ready Player Me `.glb` model loaded via `useGLTF`, lit with three-point cinema lighting including an indigo rim light, bust-framed with a custom camera rig inside a rounded glassmorphism card.

**Persistence** — SQLAlchemy ORM with Alembic migrations. Sessions, messages, code state, and execution results are all stored per-user. PostgreSQL in production, SQLite for local dev.

**Code Execution** — A sandboxed Python subprocess tool (`python_executor`) that runs user code and feeds results back into the agent context for inline AI feedback.



## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Vite + React)                   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐ │
│  │ AvatarSidebar│  │         Content Column (60%)             │ │
│  │  (40% width) │  │  ┌────────────────────────────────────┐  │ │
│  │              │  │  │  SessionHeader  +  TabBar          │  │ │
│  │  R3F Canvas  │  │  ├────────────────────────────────────┤  │ │
│  │  GLB Avatar  │  │  │  Canvas (SVG visualizer)  OR       │  │ │
│  │  Emotion     │  │  │  CodeEditor (IDE)                  │  │ │
│  │  badges      │  │  ├────────────────────────────────────┤  │ │
│  │  Step tracker│  │  │  ChatBar  (always visible)         │  │ │
│  └──────────────┘  │  └────────────────────────────────────┘  │ │
│                    └──────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               TopNav  (horizontal sessions bar)             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  State: Zustand  ·  HTTP: fetch wrapper (api/client.js)         │
└────────────────────────┬────────────────────────────────────────┘
                         │  REST + JSON
┌────────────────────────▼────────────────────────────────────────┐
│                     FastAPI  (server.py)                        │
│                                                                 │
│  Bearer token auth  →  auth_sessions table                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                LangGraph Agent  (agent.py)               │   │
│  │                                                          │   │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────────┐  │   │
│  │  │  Router    │───▶│  Tutor     │───▶│  Structured    │  │   │
│  │  │  Node      │    │  Node      │    │  JSON Output   │  │   │
│  │  │ gpt-4o-mini│    │ gpt-4o  /  │    │  speech        │  │   │
│  │  │            │    │ gemini-1.5 │    │  emotion       │  │   │
│  │  └────────────┘    └──────┬─────┘    │  canvas_actions│  │   │
│  │                           │          │  steps         │  │   │
│  │                    ┌──────▼───────┐  │  suggestions   │  │   │
│  │                    │ python_exec  │  └────────────────┘  │   │
│  │                    │ tool         │                       │   │
│  │                    └──────────────┘                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SQLAlchemy ORM  →  PostgreSQL / SQLite  ·  Alembic migrations  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ER Diagram

```
┌──────────────────────────┐
│          users           │
├──────────────────────────┤
│ id           UUID    PK  │
│ email        TEXT    UQ  │
│ password     TEXT        │
│ role         ENUM        │  student | tutor | admin
│ is_active    BOOL        │
│ created_at   TIMESTAMP   │
│ updated_at   TIMESTAMP   │
└────────────┬─────────────┘
             │ 1
     ┌───────┴───────────────────────────┐
     │ N                                 │ N
┌────▼──────────────────┐   ┌────────────▼───────────────┐
│     auth_sessions     │   │       chat_sessions        │
├───────────────────────┤   ├────────────────────────────┤
│ token      TEXT   PK  │   │ id            UUID    PK   │
│ user_id    UUID   FK  │   │ user_id       UUID    FK   │
│ created_at TIMESTAMP  │   │ title         TEXT         │
│ expires_at TIMESTAMP  │   │ learning_goal TEXT         │
└───────────────────────┘   │ current_code  TEXT         │
                            │ last_execution JSONB       │
                            │ created_at    TIMESTAMP    │
                            │ updated_at    TIMESTAMP    │
                            └───────────┬────────────────┘
                                        │ 1
                                        │ N
                            ┌───────────▼────────────────┐
                            │       chat_messages        │
                            ├────────────────────────────┤
                            │ id          UUID    PK     │
                            │ session_id  UUID    FK     │
                            │ role        ENUM           │  user | assistant | system | tool
                            │ content     TEXT           │
                            │ meta        JSONB          │
                            │ created_at  TIMESTAMP      │
                            └────────────────────────────┘
```

---

## API Reference

All routes except `/health` and `/auth/*` require:
```
Authorization: Bearer <token>
```

### Auth

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/auth/register` | `{ email, password }` | `{ token, user }` |
| `POST` | `/auth/login` | `{ email, password }` | `{ token, user }` |

### Sessions

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `GET` | `/sessions` | — | `{ sessions: Session[] }` |
| `POST` | `/sessions` | `{ title?, learning_goal? }` | `Session` |
| `GET` | `/sessions/:id` | — | `Session` |
| `DELETE` | `/sessions/:id` | — | `{ ok: true }` |
| `PUT` | `/sessions/:id/goal` | `{ goal }` | `Session` |
| `PUT` | `/sessions/:id/code` | `{ code, language? }` | `{ ok: true }` |

### Messages

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `GET` | `/sessions/:id/messages` | — | `{ messages: Message[] }` |

### AI

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| `POST` | `/sessions/:id/chat` | `{ message }` | `{ reply, structured? }` |
| `POST` | `/sessions/:id/execute` | `{ code, language? }` | `{ execution, reply?, structured? }` |

### Structured Response Shape

Every `/chat` and `/execute` response optionally includes a `structured` field:

```json
{
  "speech": "Let me walk you through binary search...",
  "emotion": "explaining",
  "canvas_mode": "whiteboard",
  "canvas_actions": [
    {
      "type": "diagram",
      "content": "<svg>...</svg>",
      "step": 1,
      "narration": "Start with a sorted array"
    }
  ],
  "follow_up_suggestions": [
    "What is the time complexity?",
    "Show me the code",
    "Give me a practice problem"
  ],
  "steps": [
    { "title": "Understand the problem", "state": "completed" },
    { "title": "Write the algorithm",    "state": "active"    },
    { "title": "Analyse complexity",     "state": "upcoming"  }
  ]
}
```

### Health

```
GET /health  →  { "status": "ok" }
```

---

## Agent Pipeline

```
User message
     │
     ▼
┌─────────────────────────────────────┐
│  Router Node  (gpt-4o-mini)         │
│  Input:  message + learning_goal    │
│  Output: route → "tutor" | "admin"  │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐
        │             │
    "tutor"        "admin"
        │             │
┌───────▼──────┐  ┌───▼────────────────┐
│  Tutor Node  │  │  Admin Node        │
│  gpt-4o  /   │  │  Handles meta      │
│  gemini-1.5  │  │  questions about   │
│              │  │  Axon itself       │
│  Tools:      │  └────────────────────┘
│  python_exec │
│  (sandboxed  │
│   subprocess)│
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Structured JSON parser              │
│  Extracts: speech, emotion, canvas,  │
│  steps, suggestions                  │
│  Fallback: default idle response     │
└──────────────┬───────────────────────┘
               │
               ▼
     Saved to DB  (chat_messages)
               │
               ▼
       HTTP response → Frontend
               │
     ┌─────────┴──────────┐
     ▼                    ▼
Avatar animates      Canvas renders
(emotion state)      step-by-step SVG
```

**LLM provider priority:**

| Priority | Provider | Env Key |
|----------|----------|---------|
| 1 | NVIDIA NIM (OpenAI-compatible) | `NVIDIA_API_KEY` |
| 2 | OpenAI | `OPENAI_API_KEY` |
| 3 | Google Gemini 1.5 Flash | `GEMINI_API_KEY` |

---

## Installation

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL (or SQLite for local dev)

### 1. Clone

```bash
git clone https://github.com/your-org/axon.git
cd axon
```

### 2. Backend

```bash
cd BackEnd

# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `.env` — set **one** LLM key:

```env
OPENAI_API_KEY=sk-...
# or
NVIDIA_API_KEY=nvapi-...
# or
GEMINI_API_KEY=...

# Optional — leave blank to use SQLite
DATABASE_URL=postgresql://user:pass@localhost:5432/axon
```

```bash
# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# Add your avatar
# Place a Ready Player Me .glb file at: frontend/public/avatar.glb
# Export one free at: https://readyplayer.me

# Start dev server
npm run dev
```

### 4. Open

```
http://localhost:5173
```

Use **Continue as Guest** to skip registration, or create an account.

### Docker

```bash
docker compose up --build
```

### Environment Variables

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `OPENAI_API_KEY` | Backend | One of three | OpenAI API key |
| `NVIDIA_API_KEY` | Backend | One of three | NVIDIA NIM API key |
| `GEMINI_API_KEY` | Backend | One of three | Google Gemini API key |
| `DATABASE_URL` | Backend | No | Postgres URL (defaults to SQLite) |
| `VITE_API_BASE_URL` | Frontend | Yes | Backend base URL |

---

## Project Structure

```
axon/
├── BackEnd/
│   ├── main.py              # App entrypoint
│   ├── server.py            # FastAPI routes + auth middleware
│   ├── agent.py             # LangGraph agent (router + tutor + admin nodes)
│   ├── models.py            # SQLAlchemy ORM models
│   ├── prompts.py           # LLM system prompts
│   ├── tools.py             # python_executor sandboxed tool
│   ├── states.py            # Agent state type definitions
│   ├── db.py                # DB session factory
│   └── alembic/             # Migration scripts
│       └── versions/
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   └── WorkspacePage.jsx    # Main 4-zone layout + state wiring
    │   ├── components/
    │   │   ├── AvatarSidebar/       # 3D avatar panel + step tracker
    │   │   ├── TopNav/              # Horizontal sessions bar
    │   │   ├── ChatBar/             # Pinned bottom chat input
    │   │   ├── Canvas/              # SVG step visualizer
    │   │   ├── IDE/                 # Code editor
    │   │   └── Auth/                # Login / register
    │   ├── store/
    │   │   ├── useAuthStore.js      # Auth state (Zustand)
    │   │   └── useWorkspaceStore.js # Session + message state (Zustand)
    │   └── api/
    │       └── client.js            # Typed fetch wrapper
    └── public/
        └── avatar.glb               # Ready Player Me avatar (add your own)
```

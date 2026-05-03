<div align="center">
  <img src="frontend/public/favicon.svg" width="80" height="80" alt="CodeForge AI" />
  <h1>CodeForge AI</h1>
  <p><strong>Autonomous, multi-agent coding platform — self-hostable, open-source</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" />
    <img src="https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb" />
    <img src="https://img.shields.io/badge/License-MIT-blue" />
  </p>
</div>

---

## Overview

CodeForge AI is a **production-grade, multi-agent coding assistant** that connects to your GitHub repositories, analyzes code, streams AI responses in real time, and ships features autonomously.  Deploy it entirely yourself — Vercel (frontend) + Render (backend) — with no vendor lock-in.

```
┌─────────────────────────────────────────────────────────────────┐
│                      CodeForge AI Stack                         │
│                                                                 │
│  ┌──────────────┐   ┌──────────────────┐   ┌───────────────┐  │
│  │   Frontend   │   │   Node.js API    │   │  Python API   │  │
│  │  React + TS  │◄──│  Express + WS    │   │  FastAPI +    │  │
│  │   (Vercel)   │   │  (Render)        │   │  LangGraph    │  │
│  └──────┬───────┘   └────────┬─────────┘   └──────┬────────┘  │
│         │                   │                      │           │
│         └───────────────────┼──────────────────────┘           │
│                             ▼                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐   │
│  │  MongoDB Atlas│  │   Qdrant DB   │  │    OpenRouter    │   │
│  │  (Documents)  │  │ (Vector Store)│  │ (AI Models: Free)│   │
│  └───────────────┘  └───────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Orchestration** | Planner, Coder, Researcher, Debug, Security & Deployment agents |
| **GitHub Integration** | OAuth login, repo scanning, file tree analysis, AI-powered repo analysis |
| **Real-time AI Streaming** | SSE + WebSocket — every token streams live; collaborators see it too |
| **Live Collaboration** | Share any chat session — multiple users, one live stream |
| **Web Search** | Agents use Tavily to search docs, CVEs, and best practices |
| **Security Scanner** | Detects secrets, injections, and vulnerable packages |
| **WhatsApp Bot** | Chat with CodeForge AI via WhatsApp (Twilio) |
| **VS Code Extension** | Full Cursor-like experience: diff view, one-click apply, inline chat |
| **Repository Analyzer** | AI-powered architecture analysis with improvement suggestions |
| **Deployments Dashboard** | Track deploys across AWS, GCP, Azure, Docker, Kubernetes |

## Project Structure

```
CodeForge-AI/
├── frontend/          # React 19 + Vite + TypeScript → deploy to Vercel
├── node_api/          # Express + WebSocket API → deploy to Render
├── backend/           # FastAPI + LangGraph agents → deploy to Render
├── vscode-extension/  # VS Code extension (publish to Marketplace)
├── .env.example       # All required env vars
├── Makefile           # Dev shortcuts
├── render.yaml        # One-click Render deploy
└── vercel.json        # Vercel SPA rewrites
```

## Local Setup

### Prerequisites
- **Node.js 20+**
- **Python 3.11+**
- **MongoDB Atlas** free cluster → [mongodb.com](https://www.mongodb.com/atlas)
- **OpenRouter** free API key → [openrouter.ai](https://openrouter.ai)
- **GitHub OAuth App** → [github.com/settings/apps](https://github.com/settings/apps)

### Step 1 — Clone & Install

```bash
git clone https://github.com/yathik-2622/CodeForge-AI.git
cd CodeForge-AI

# Install all at once
make install
# Or individually:
cd frontend   && npm install
cd ../node_api && npm install
cd ../backend  && pip install -r requirements.txt
```

### Step 2 — Environment Variables

Copy `.env.example` to each service directory:

```bash
cp .env.example frontend/.env.local
cp .env.example node_api/.env
cp .env.example backend/.env
```

Then edit each file with real values (see [env vars table](#environment-variables) below).

#### Create GitHub OAuth App
1. Go to **GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App**
2. Set **Callback URL** to `http://localhost:8080/api/auth/github/callback`
3. Copy **Client ID** and **Client Secret** → add to `.env`

### Step 3 — Run Locally

Open **3 terminals**:

```bash
# Terminal 1 – Frontend (http://localhost:5173)
cd frontend && npm run dev

# Terminal 2 – Node.js API (http://localhost:8080)
cd node_api && npm run dev

# Terminal 3 – Python API (http://localhost:9000)
cd backend && uvicorn main:app --reload --port 9000
```

Open `http://localhost:5173` — the frontend proxies `/api` to `localhost:8080`.

### Step 4 — Seed Sample Data (optional)

```bash
cd node_api && node scripts/seed.mjs
```

## Environment Variables

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `MONGODB_URL` | node_api, backend | ✅ | MongoDB Atlas connection string |
| `MONGODB_DB` | node_api, backend | ✅ | Database name (default: `CodeForge_AI`) |
| `OPENROUTER_API_KEY` | node_api, backend | ✅ | AI completions (free models available) |
| `QDRANT_URL` | backend | ✅ | Qdrant cloud cluster URL |
| `QDRANT_API_KEY` | backend | ✅ | Qdrant API key |
| `GITHUB_CLIENT_ID` | node_api | ✅ | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | node_api | ✅ | GitHub OAuth app secret |
| `SESSION_SECRET` | node_api | ✅ | 32+ char random string for JWT signing |
| `TAVILY_API_KEY` | node_api, backend | ☐ | Web search (optional but recommended) |
| `TWILIO_ACCOUNT_SID` | node_api | ☐ | WhatsApp bot (optional) |
| `TWILIO_AUTH_TOKEN` | node_api | ☐ | WhatsApp bot (optional) |
| `TWILIO_WHATSAPP_FROM` | node_api | ☐ | E.g. `whatsapp:+14155238886` |
| `APP_URL` | node_api | prod | Public URL of node_api |
| `FRONTEND_URL` | node_api | prod | Public URL of frontend |
| `ALLOWED_ORIGINS` | node_api | prod | Comma-separated allowed CORS origins |
| `VITE_API_URL` | frontend | prod | Points to node_api (e.g. `https://api.example.com`) |

## Deploy to Vercel + Render

### Frontend → Vercel

1. Push to GitHub
2. Import repo in **Vercel** → select `frontend/` as root directory
3. Set `VITE_API_URL=https://your-render-api.onrender.com`
4. Deploy → get your `.vercel.app` URL

### Backend → Render (one-click)

Click **"New → Blueprint"** in Render and point to this repo — `render.yaml` auto-configures both services.

Or manually:
```
Service 1: node_api/   (Node) – build: npm install && npm run build – start: node dist/index.mjs
Service 2: backend/    (Python) – build: pip install -r requirements.txt – start: uvicorn main:app ...
```

## VS Code Extension

```bash
cd vscode-extension
npm install
# Press F5 to launch Extension Development Host
# Or package it:
npx vsce package
```

Set `CODEFORGE_URL` in VS Code settings to point to your deployed API.

## AI Models (free via OpenRouter)

| Model | Speed | Context | Best for |
|-------|-------|---------|----------|
| Mistral 7B Instruct | Fast | 32k | General coding, quick fixes |
| Llama 3 8B Instruct | Fast | 8k | Code generation |
| Phi-3 Mini 128k | Medium | 128k | Long file analysis |
| Gemma 3 12B | Medium | 8k | Code review |

## License

MIT — fork it, self-host it, ship it.

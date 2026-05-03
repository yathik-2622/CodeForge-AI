<div align="center">
  <img src="frontend/public/favicon.svg" width="80" height="80" alt="CodeForge AI" />
  <h1>CodeForge AI</h1>
  <p><strong>Autonomous, multi-agent coding platform — self-hostable, open-source, 23 free AI models</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" />
    <img src="https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb" />
    <img src="https://img.shields.io/badge/OpenRouter-Free-6366f1" />
    <img src="https://img.shields.io/badge/Groq-Ultra--fast-f97316" />
    <img src="https://img.shields.io/badge/License-MIT-blue" />
  </p>
</div>

---

## What Is CodeForge AI?

CodeForge AI is a **production-grade, multi-agent coding assistant** that you run yourself. Connect it to your GitHub repos, chat with AI about your codebase, auto-fix bugs, search the web, and deploy — all with **23 completely free AI models** (no paid API required).

| Component | Tech | Purpose |
|-----------|------|---------|
| **Web App** | React 19 + Vite + Tailwind | Dashboard, chat UI, model selector |
| **Node API** | Express + Fastify streaming | Real-time AI streaming, WebSocket, GitHub OAuth |
| **Python Backend** | FastAPI + LangGraph | AI agents, MongoDB, WhatsApp, web search |
| **CLI** (`cf`) | Node.js | Full coding agent in your terminal |
| **VS Code Extension** | VS Code API | AI directly inside your editor |
| **WhatsApp Bot** | Twilio | Chat with AI on WhatsApp |

---

## 23 Free AI Models

### OpenRouter (free, no credit card)
| Model | Context | Best For |
|-------|---------|---------|
| Mistral 7B Instruct | 32k | Fast general coding |
| Llama 3.1 8B Instruct | 128k | Long codebases |
| Gemma 3 12B | 128k | Google's latest |
| DeepSeek R1 | 163k | Deep reasoning |
| DeepSeek R1 Distill 70B | 128k | Reasoning + speed |
| Qwen 2.5 7B | 128k | Code generation |
| Mistral Nemo 12B | 128k | Balanced |
| OpenChat 7B | 8k | Conversation |
| + 3 more | — | — |

### Groq (free, ultra-fast ~200ms)
| Model | Context | Best For |
|-------|---------|---------|
| Llama 4 Maverick 17B (128E) | 128k | Best overall |
| Llama 4 Scout 17B (16E) | 128k | Fast + capable |
| Llama 3.3 70B Versatile | 128k | Complex tasks |
| Llama 3.1 8B Instant | 128k | Fastest |
| Qwen QwQ 32B | 128k | Math + reasoning |
| DeepSeek R1 Distill 70B | 128k | Reasoning |
| Compound Beta | 128k | Agentic tasks |
| + 5 more | — | — |

---

## Quick Start

### Prerequisites
- Node.js 18+ — https://nodejs.org
- Python 3.11+ — https://python.org/downloads
- MongoDB Atlas free account — https://cloud.mongodb.com

### Get Free API Keys
- **OpenRouter**: https://openrouter.ai/keys (no credit card)
- **Groq**: https://console.groq.com/keys (no credit card)
- **Tavily** (web search): https://tavily.com (free tier)

### Clone & Setup

```bash
git clone https://github.com/yathik-2622/CodeForge-AI.git
cd CodeForge-AI
```

Create `backend/.env`:
```
MONGODB_URL=mongodb+srv://USER:PASS@cluster.mongodb.net
MONGODB_DB=codeforge
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SESSION_SECRET=any-random-32-char-string
TAVILY_API_KEY=tvly-...
PORT=9000
FRONTEND_URL=http://localhost:5173
```

Create `node_api/.env`:
```
MONGODB_URL=mongodb+srv://USER:PASS@cluster.mongodb.net
MONGODB_DB=codeforge
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SESSION_SECRET=any-random-32-char-string
PORT=3000
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:3000
VITE_PYTHON_API_URL=http://localhost:9000
```

### Run (3 terminals)

```bash
# Terminal 1 — Frontend
cd frontend && npm install && npm run dev

# Terminal 2 — Node API
cd node_api && npm install && npm run dev

# Terminal 3 — Python Backend
cd backend && python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

Open http://localhost:5173

---

## CLI — `cf` Command

The CLI is a full autonomous coding agent in your terminal — like Claude Code.

### Install
```bash
cd cli
npm install
npm run build
npm link
```

### Save API Keys (one time)
```bash
cf config --openrouter-key sk-or-v1-...
cf config --groq-key gsk_...
```

### All Commands

| Command | Description |
|---------|-------------|
| `cf` | Interactive AI chat with your project context |
| `cf ask "question"` | Quick one-shot answer |
| `cf fix file.ts` | AI-powered fix with diff preview |
| `cf explain file.ts` | Explain code in plain English |
| `cf analyze .` | Audit entire project for bugs/security |
| `cf generate "description"` | Generate a complete file from description |
| `cf commit` | AI-generated conventional commit message |
| `cf run "cmd" --watch` | Run command + auto-fix loop until it passes |
| `cf models` | List all 23 models |
| `cf config` | View/set configuration |
| `cf status` | Check server connectivity |

### `cf generate` Examples
```bash
cf generate "FastAPI endpoint for user registration with JWT auth"
cf generate "React hook to debounce input" --out src/hooks/useDebounce.ts
cf generate "PostgreSQL schema for a multi-tenant SaaS" --lang sql
cf generate "Python script to parse CSV and insert into MongoDB"
cf generate "Express middleware for rate limiting with Redis"
```

### `cf run --watch` (Autonomous Fix Loop)
```bash
cf run "npm test" --watch          # AI fixes failures until tests pass
cf run "cargo build" --watch       # Fix Rust compilation errors automatically
cf run "pytest" --max-attempts 5   # Retry up to 5 times
```

---

## VS Code Extension

Adds CodeForge AI directly inside VS Code.

### Install
```bash
cd vscode-extension
npm install
npm run compile
npx vsce package --no-dependencies
code --install-extension codeforge-ai-0.1.0.vsix
```

### Features
- Right-click any code → **Ask / Fix / Explain / Generate Tests / Refactor**
- Sidebar chat panel with session history
- Model selector (`Ctrl+Shift+M`) — all 23 models
- Keyboard shortcuts:
  - `Ctrl+Shift+A` — Open chat
  - `Ctrl+Shift+Q` — Ask about selection
  - `Ctrl+Shift+F` — Fix selection

---

## WhatsApp Integration

Chat with CodeForge AI on WhatsApp via Twilio.

1. Create free Twilio account → enable WhatsApp Sandbox
2. Expose backend: `ngrok http 9000`
3. Set webhook: `https://YOUR_NGROK_URL/api/whatsapp/webhook`
4. Add to `backend/.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
5. Restart backend → `"whatsapp": "configured"` in health check

**WhatsApp commands:** `hi`, `/help`, `/new`, `/history`, or any coding question.

**Display name "CodeForge AI":** Requires a registered WhatsApp Business number (Meta approval, 1-3 days).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CodeForge AI Stack                       │
│                                                              │
│  ┌─────────────┐    ┌──────────────────┐  ┌─────────────┐  │
│  │  Frontend   │◄──►│  Node.js API     │  │ Python API  │  │
│  │ React + TS  │    │  :3000           │  │ FastAPI     │  │
│  │ Vite + TW4  │    │  AI streaming    │  │ :9000       │  │
│  │  :5173      │    │  GitHub OAuth    │  │ LangGraph   │  │
│  └─────────────┘    │  WebSocket       │  │ WhatsApp    │  │
│                     └────────┬─────────┘  └──────┬──────┘  │
│  ┌─────────────┐             │                   │          │
│  │  CLI (cf)   │             └─────────┬─────────┘          │
│  │  Terminal   │                       ▼                     │
│  │  Agent      │    ┌──────────────────────────────────┐    │
│  └─────────────┘    │         MongoDB Atlas             │    │
│                     │    + Qdrant (vector search)       │    │
│  ┌─────────────┐    └──────────────────────────────────┘    │
│  │  VS Code    │                                             │
│  │  Extension  │    ┌──────────────────────────────────┐    │
│  └─────────────┘    │  OpenRouter (11 free models)     │    │
│                     │  + Groq (12 ultra-fast models)   │    │
│                     └──────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Do you need both Node API and FastAPI?**

Short answer: Yes, they serve different purposes.
- **Node API** — Real-time AI streaming (SSE/WebSocket), GitHub OAuth sessions, dashboard
- **FastAPI** — AI agents (LangGraph), MongoDB, WhatsApp webhook, web search (Tavily)

If you want to simplify, you could migrate the AI streaming to FastAPI, but the Node API's Fastify/WS stack handles concurrent streams more efficiently.

---

## Deployment

- **Frontend** → Vercel (set `VITE_API_URL` to your Render URL)
- **Node API** → Render (web service, Node 20)
- **Python Backend** → Render (web service, Python 3.11)
- **MongoDB** → Atlas (free M0 tier)

See `SETUP.md` for complete setup, testing, and troubleshooting guide.

---

## License

MIT — use it, fork it, ship it.

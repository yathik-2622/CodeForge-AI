# ⚡ CodeForge AI

<div align="center">

**A self-hosted, production-grade AI coding agent** — web app, VS Code extension, and WhatsApp integration.  
Free forever. No subscriptions. Runs on your own infrastructure.

[![Deploy Frontend](https://img.shields.io/badge/Deploy%20Frontend-Vercel-black?logo=vercel)](https://vercel.com/new)
[![Deploy Backend](https://img.shields.io/badge/Deploy%20Backend-Render-blue?logo=render)](https://render.com)
[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://python.org)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-purple)](LICENSE)

</div>

---

## What is CodeForge AI?

CodeForge AI is an **autonomous multi-agent coding assistant** you deploy yourself — like a self-hosted Cursor or Claude Code. It runs a LangGraph multi-agent pipeline (Supervisor → Researcher → Coder) that can search the web, write code, fix bugs, generate tests, and explain anything — streamed token-by-token.

Use it from **anywhere**:

| Interface | How to use |
|-----------|------------|
| 🌐 **Web App** | Full dashboard — chat, repos, deployments, security, WhatsApp |
| 🧩 **VS Code Extension** | Sidebar chat panel, right-click AI commands, keyboard shortcuts |
| 💬 **WhatsApp** | Message your Twilio number — full agent from your phone |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 19 + Vite + Tailwind CSS | Fast SPA, deploy to Vercel |
| **Node.js API** | Express + TypeScript + MongoDB | Auth, sessions, repos, WebSocket |
| **Python Backend** | FastAPI + LangGraph + LangChain | Multi-agent AI pipeline, SSE streaming |
| **AI Models** | OpenRouter (free) | Mistral 7B, Llama 3 8B, Phi-3 Mini, Gemma 3 12B |
| **Database** | MongoDB Atlas | All app data — free tier, no SQL |
| **Vector DB** | Qdrant Cloud | Semantic code search — free tier |
| **Web Search** | Tavily API | Real-time research inside the agent |
| **Auth** | GitHub OAuth | Sign in with GitHub |
| **Messaging** | Twilio WhatsApp | Full agent over WhatsApp |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interfaces                          │
│  React Web App      VS Code Extension     WhatsApp          │
└────────┬────────────────────┬────────────────┬─────────────┘
         │                    │                │
         ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js API Server (Express)                   │
│  Auth/OAuth  Sessions  Repos  Deployments  WebSocket/SSE    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          Python FastAPI + LangGraph Multi-Agent             │
│                                                             │
│   ┌──────────────┐    ┌─────────────┐   ┌──────────────┐   │
│   │  Supervisor  │───▶│  Researcher │   │    Coder     │   │
│   │   (routes)   │    │ (Tavily web)│   │ (OpenRouter) │   │
│   └──────────────┘    └─────────────┘   └──────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌──────────────────┐    ┌──────────────────────┐
    │  MongoDB Atlas   │    │    Qdrant Cloud       │
    │  (all app data)  │    │  (vector/semantic)    │
    └──────────────────┘    └──────────────────────┘
```

---

## Quick Start (Local)

### Prerequisites

```bash
node --version    # v20 or higher
python3 --version # 3.11 or higher
npm install -g pnpm
```

### 1. Clone

```bash
git clone https://github.com/yathik-2622/CodeForge-AI.git
cd CodeForge-AI
```

### 2. Set up environment

```bash
bash setup-env.sh   # creates .env and backend/.env with all credentials
```

> If `setup-env.sh` is blocked by GitHub secret scanning, manually create `.env` by copying the values from `.env.example` and filling in your credentials.

### 3. Install dependencies

```bash
# Node.js (frontend + API)
pnpm install

# Python backend
cd backend && pip install -r requirements.txt && cd ..
```

### 4. Run all three services

Open **3 terminal tabs**:

**Terminal 1 — Python AI backend (port 9000)**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 9000
```

**Terminal 2 — Node.js API server (port 8080)**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 3 — React frontend (port 5173)**
```bash
pnpm --filter @workspace/codeforge run dev
```

Then open http://localhost:5173

### 5. Sign in

Click **"Sign in with GitHub"** — it uses your GitHub OAuth app credentials from `.env`.

> First-time GitHub OAuth setup: go to https://github.com/settings/applications/new  
> Set callback URL to: `http://localhost:8080/api/auth/github/callback`

---

## VS Code Extension

```bash
cd artifacts/vscode-extension
npm install
npm run compile
```

Then press **F5** in VS Code to launch a new Extension Development Host window.

### Commands
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Open CodeForge chat |
| `Ctrl+Shift+Q` | Ask about selected code |
| `Ctrl+Shift+F` | Fix selected code |
| Right-click | Explain / Refactor / Generate Tests / Search |

### Apply to File (like Cursor)
Every AI code response has an **⚡ Apply** button that opens a diff view — review the changes, then click Apply to write to file.

**Publish to Marketplace:**
```bash
npm install -g @vscode/vsce
vsce login <your-publisher-id>   # from marketplace.visualstudio.com/manage
vsce publish
```

---

## WhatsApp Integration

1. Sign up at https://www.twilio.com → get a WhatsApp sandbox number
2. Set your Twilio credentials in `.env`
3. For local testing, expose your backend with ngrok:
   ```bash
   ngrok http 9000
   ```
4. Set webhook in Twilio: `https://<ngrok-url>/api/whatsapp/webhook`
5. Message `+14155238886` with `join <your-sandbox-word>`
6. Then send: `/start`, `/new`, `/history`, or just ask any coding question

---

## Deploy to Vercel + Render

### Frontend → Vercel

1. Import this GitHub repo in [Vercel](https://vercel.com/new)
2. Add environment variable:
   ```
   VITE_API_URL = https://codeforge-api.onrender.com
   ```
3. Deploy — Vercel reads `vercel.json` automatically

### Backend → Render

1. Go to [Render](https://render.com) → New → Blueprint
2. Connect this GitHub repo — Render reads `render.yaml` automatically
3. It creates **2 services**: `codeforge-api` (Node.js) + `codeforge-backend` (Python)
4. Add all environment variables from `.env` to each service in Render dashboard

### Update GitHub OAuth callback
After deploying, update your GitHub OAuth App callback URL:
```
https://codeforge-api.onrender.com/api/auth/github/callback
```

### Update Twilio webhook
```
https://codeforge-backend.onrender.com/api/whatsapp/webhook
```

---

## Environment Variables

| Variable | Description | Where to get |
|----------|-------------|-------------|
| `MONGODB_URL` | MongoDB Atlas connection string | [atlas.mongodb.com](https://atlas.mongodb.com) |
| `MONGODB_DB` | Database name (e.g. `CodeForge_AI`) | You choose |
| `OPENROUTER_API_KEY` | Free AI models | [openrouter.ai](https://openrouter.ai) |
| `QDRANT_URL` | Qdrant Cloud cluster URL | [cloud.qdrant.io](https://cloud.qdrant.io) |
| `QDRANT_API_KEY` | Qdrant API key | [cloud.qdrant.io](https://cloud.qdrant.io) |
| `TAVILY_API_KEY` | Web search API | [tavily.com](https://tavily.com) |
| `GITHUB_CLIENT_ID` | OAuth App client ID | [github.com/settings/apps](https://github.com/settings/applications/new) |
| `GITHUB_CLIENT_SECRET` | OAuth App secret | Same as above |
| `SESSION_SECRET` | JWT signing secret | Generate: `openssl rand -base64 64` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | [console.twilio.com](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Same as above |
| `TWILIO_WHATSAPP_FROM` | Your Twilio WhatsApp number | Same as above |
| `VITE_API_URL` | Backend URL for frontend | Your Render Node.js URL |
| `FRONTEND_URL` | Frontend URL for backend CORS | Your Vercel URL |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | Your Vercel URL |

---

## AI Models (All Free)

| Model | Provider | Best for |
|-------|----------|---------|
| `mistralai/mistral-7b-instruct:free` | Mistral AI | General coding |
| `meta-llama/llama-3-8b-instruct:free` | Meta | Reasoning + explanation |
| `microsoft/phi-3-mini-128k-instruct:free` | Microsoft | Fast responses |
| `google/gemma-3-12b-it:free` | Google | Complex tasks |

Switch models in the Sessions page or configure per-session.

---

## Project Structure

```
CodeForge-AI/
├── artifacts/
│   ├── codeforge/          # React frontend (deploy to Vercel)
│   │   ├── src/
│   │   │   ├── pages/      # Dashboard, Chat, Repos, Security...
│   │   │   ├── components/ # UI components
│   │   │   └── lib/        # Auth, API client
│   │   └── vite.config.ts
│   ├── api-server/         # Node.js API (deploy to Render)
│   │   └── src/
│   │       ├── routes/     # sessions, auth, repos, github, whatsapp...
│   │       ├── middleware/ # JWT auth
│   │       └── lib/        # MongoDB, AI client, WebSocket
│   └── vscode-extension/   # VS Code extension (publish to Marketplace)
│       └── src/
│           ├── extension.ts
│           ├── client.ts
│           └── providers/  # ChatViewProvider, SessionsViewProvider
├── backend/                # Python FastAPI + LangGraph (deploy to Render)
│   ├── main.py
│   └── app/
│       ├── agents/         # LangGraph multi-agent graph
│       ├── routes/         # sessions, whatsapp, health...
│       └── db/             # MongoDB + Qdrant clients
├── lib/                    # Shared TypeScript libraries
│   ├── api-spec/           # OpenAPI spec (source of truth)
│   ├── api-client-react/   # Generated React Query hooks
│   └── api-zod/            # Generated Zod schemas
├── vercel.json             # Vercel deployment config
├── render.yaml             # Render deployment config
└── setup-env.sh            # Creates .env with credentials
```

---

## Troubleshooting

**"Failed to connect to MongoDB"**
→ Check your `MONGODB_URL` in `.env` and that your IP is whitelisted in Atlas (or use `0.0.0.0/0` for dev)

**"GitHub OAuth not working"**
→ Make sure callback URL in GitHub OAuth App settings matches exactly: `http://localhost:8080/api/auth/github/callback`

**"AI not responding"**
→ Check `OPENROUTER_API_KEY` is valid at https://openrouter.ai/keys

**Frontend shows blank page**
→ Make sure all 3 services are running. The frontend proxies `/api` to port 8080.

**WhatsApp not receiving messages**
→ Verify ngrok is running and the webhook URL is set in Twilio console

---

## License

MIT — use it, fork it, sell it, deploy it.

---

<div align="center">
Built with FastAPI · LangGraph · React · MongoDB · OpenRouter · Qdrant · Twilio
</div>

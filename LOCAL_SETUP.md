# CodeForge AI — Complete Local Setup Guide

Clone it, run it, and use it exactly like Cursor or Claude Code — locally.

---

## What You're Getting

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite + Tailwind | Dashboard, Chat, Repos, Deployments |
| Node.js API | Express + MongoDB | Auth, sessions, repositories, WebSocket |
| Python Backend | FastAPI + LangGraph | Multi-agent AI, SSE streaming, Tavily search |
| Database | MongoDB Atlas | All app data (no PostgreSQL anywhere) |
| Vector DB | Qdrant Cloud | Semantic code search |
| AI | OpenRouter (free models) | Mistral 7B, Llama 3, Phi-3, Gemma 3 |
| Auth | GitHub OAuth | Login with your GitHub account |
| Messaging | Twilio WhatsApp | Control the agent from WhatsApp |
| VS Code | Extension | Chat panel, right-click AI commands |

---

## Prerequisites

Install these before starting:

```bash
# Node.js 20+
node --version   # must be v20+

# Python 3.11+
python3 --version  # must be 3.11+

# pnpm (fast Node package manager)
npm install -g pnpm

# (optional) VS Code for the extension
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/yathik-2622/CodeForge-AI.git
cd CodeForge-AI
```

---

## Step 2: Create Your Environment File

```bash
cp backend/.env.example backend/.env
```

Now open `backend/.env` and fill in your real values:

```env
# ── AI ─────────────────────────────────────────────────────────────────────
# Get a free key at https://openrouter.ai (no credit card needed)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# ── MongoDB Atlas ────────────────────────────────────────────────────────────
# Free cluster at https://mongodb.com/atlas
# Format: mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB=codeforge

# ── Qdrant Cloud ─────────────────────────────────────────────────────────────
# Free tier at https://cloud.qdrant.io
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key

# ── Tavily Search ─────────────────────────────────────────────────────────────
# Free at https://tavily.com (1000 searches/month free)
TAVILY_API_KEY=tvly-dev-your-key

# ── GitHub OAuth ──────────────────────────────────────────────────────────────
# Create at https://github.com/settings/developers → New OAuth App
# Homepage URL: http://localhost:3000
# Callback URL: http://localhost:3000/api/auth/github/callback
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# ── App URLs ──────────────────────────────────────────────────────────────────
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# ── Session Secret ────────────────────────────────────────────────────────────
# Any random 32+ character string
SESSION_SECRET=change-me-to-a-long-random-secret-value

# ── WhatsApp (optional) ───────────────────────────────────────────────────────
# Free sandbox at https://twilio.com → Console → Messaging → Try WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

The Node.js API server also needs these as real environment variables (not just in `.env`).
Create a `.env` file in the root too, or export them in your shell:

```bash
# Root .env (for Node.js API server)
cp backend/.env .env
# The Node.js server reads from process.env, which Replit/dotenv populates
```

---

## Step 3: Install Dependencies

```bash
# Install all Node.js packages (frontend + API server + shared libs)
pnpm install

# Install Python packages
cd backend
pip install -r requirements.txt
cd ..
```

---

## Step 4: Run All Services

Open **3 terminals** and run one command in each:

### Terminal 1 — Python Backend (AI Agent)
```bash
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```
You should see:
```
⚡ CodeForge AI — Backend Starting
  OpenRouter: ✅
  Tavily   : ✅
  GitHub   : ✅
✅ MongoDB connected — db: 'codeforge'
✅ Qdrant cloud connected
✅ CodeForge AI is running!
```

### Terminal 2 — Node.js API Server (Auth + Sessions)
```bash
# Set env vars first (or use dotenv-cli)
export $(cat .env | xargs)
PORT=8080 pnpm --filter @workspace/api-server run dev
```

### Terminal 3 — React Frontend
```bash
PORT=3000 pnpm --filter @workspace/codeforge run dev
```

---

## Step 5: Open the App

Visit: **http://localhost:3000**

Click **"Sign in with GitHub"** — you'll be redirected to GitHub OAuth, then back to the dashboard.

---

## Step 6: Create Your First AI Session

1. Click **Chat** in the sidebar
2. Click **New Session**
3. Type: `Fix all TypeScript errors in my auth module`
4. Watch the AI respond token-by-token with real streaming

---

## Using the VS Code Extension (Like Cursor)

The extension is in `artifacts/vscode-extension/`. To use it:

### Option A: Run from source (development mode)

```bash
cd artifacts/vscode-extension
npm install
npm run compile
```

Then in VS Code:
- Press `F5` to open Extension Development Host
- The CodeForge AI panel appears in the Activity Bar (left sidebar)

### Option B: Package and install permanently

```bash
cd artifacts/vscode-extension
npm install
npm run package   # creates codeforge-ai-0.1.0.vsix
```

Then install it:
```bash
code --install-extension codeforge-ai-0.1.0.vsix
```

### Extension Features

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+A` | Open CodeForge AI chat panel |
| `Ctrl+Shift+Q` | Ask AI about selected code |
| `Ctrl+Shift+F` | Fix selected code |
| Right-click selection | Ask / Fix / Explain / Generate Tests / Refactor |

**First time setup:** Go to VS Code Settings → search `codeforge` → set `Server URL` to `http://localhost:3000`

---

## WhatsApp Integration

Once Twilio is configured, send a WhatsApp message to your Twilio number:

| Command | What it does |
|---|---|
| `hi` or `/start` | Welcome message |
| `/new` | Start a fresh session |
| `/history` | See last few messages |
| `/help` | Show all commands |
| `Fix this error: TypeError...` | AI responds with fix |
| `Search for best React patterns 2025` | Triggers web search |

**Set the Twilio webhook URL to:**
```
https://your-domain.com/api/whatsapp/webhook
```
For local testing use [ngrok](https://ngrok.com):
```bash
ngrok http 9000
# Then set: https://abc123.ngrok.io/api/whatsapp/webhook
```

---

## Architecture Overview

```
Browser / VS Code Extension
        │
        ▼
┌─────────────────────────────────┐
│  Reverse Proxy (port 3000)      │
│  /api  → Node.js (port 8080)   │
│  /     → React  (port 3000)    │
└─────────────────────────────────┘
        │
        ├── Node.js API Server (port 8080)
        │   ├── GitHub OAuth login
        │   ├── Session CRUD + WebSocket
        │   ├── Repository scanning
        │   ├── Deployments + Security
        │   └── MongoDB Atlas
        │
        └── Python FastAPI (port 9000)
            ├── LangGraph multi-agent
            │   ├── Supervisor → routes intent
            │   ├── Researcher → Tavily web search
            │   ├── Coder → expert code generation
            │   └── Direct → fast answers
            ├── SSE streaming (token-by-token)
            ├── WebSocket broadcasting
            ├── MongoDB Atlas
            ├── Qdrant (semantic search)
            └── Twilio (WhatsApp)
```

---

## Publishing the VS Code Extension to the Marketplace

To make it available on https://marketplace.visualstudio.com:

### 1. Create a publisher account
```
https://marketplace.visualstudio.com/manage
```
Create a publisher ID (e.g., `codeforge-ai`).

### 2. Get a Personal Access Token
- Go to: https://dev.azure.com → User Settings → Personal Access Tokens
- Create token with **Marketplace → Manage** scope

### 3. Login and publish
```bash
cd artifacts/vscode-extension
npm install -g @vscode/vsce
vsce login codeforge-ai   # enter your PAT
vsce publish              # publishes to marketplace
```

### 4. Update package.json before publishing
```json
{
  "publisher": "your-publisher-id",
  "icon": "media/icon.png"   // must be a 128x128 PNG
}
```

> Note: You need an icon.png (128×128) before publishing. The SVG icon is for development.

---

## Comparison: CodeForge AI vs Cursor vs Claude Code

| Feature | CodeForge AI | Cursor | Claude Code |
|---|---|---|---|
| AI Chat | ✅ Streaming | ✅ | ✅ |
| Web Search | ✅ Tavily | ❌ | ❌ |
| Multi-agent | ✅ LangGraph | ❌ | ❌ |
| WhatsApp | ✅ Twilio | ❌ | ❌ |
| VS Code Extension | ✅ | ✅ Built-in | ✅ Built-in |
| Self-hosted | ✅ Fully | ❌ SaaS | ❌ SaaS |
| Free models | ✅ OpenRouter | ❌ Paid | ❌ Paid |
| MongoDB | ✅ Atlas | N/A | N/A |
| Open Source | ✅ GitHub | ❌ | ❌ |

---

## Troubleshooting

**MongoDB connection fails:**
- Make sure your Atlas cluster allows connections from `0.0.0.0/0` (Network Access)
- Check the connection string format: `mongodb+srv://user:pass@cluster.mongodb.net/`

**GitHub OAuth redirect fails:**
- Make sure callback URL in GitHub OAuth App matches exactly: `http://localhost:3000/api/auth/github/callback`

**AI responses not streaming:**
- Check `OPENROUTER_API_KEY` is set and valid at https://openrouter.ai/keys

**Qdrant connection fails:**
- Verify your cluster URL and API key at https://cloud.qdrant.io

**WhatsApp webhook not receiving:**
- Use ngrok for local testing: `ngrok http 9000`
- Set the ngrok URL in Twilio console

---

## Environment Variables Summary

| Variable | Required | Where to get |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ Yes | https://openrouter.ai |
| `MONGODB_URL` | ✅ Yes | https://mongodb.com/atlas |
| `MONGODB_DB` | ✅ Yes | Set to `codeforge` |
| `QDRANT_URL` | ✅ Yes | https://cloud.qdrant.io |
| `QDRANT_API_KEY` | ✅ Yes | https://cloud.qdrant.io |
| `TAVILY_API_KEY` | ✅ Yes | https://tavily.com |
| `GITHUB_CLIENT_ID` | ✅ Yes | https://github.com/settings/developers |
| `GITHUB_CLIENT_SECRET` | ✅ Yes | https://github.com/settings/developers |
| `SESSION_SECRET` | ✅ Yes | Any 32+ char random string |
| `APP_URL` | ✅ Yes | `http://localhost:3000` locally |
| `TWILIO_ACCOUNT_SID` | Optional | https://twilio.com |
| `TWILIO_AUTH_TOKEN` | Optional | https://twilio.com |
| `TWILIO_WHATSAPP_FROM` | Optional | Your Twilio WhatsApp number |

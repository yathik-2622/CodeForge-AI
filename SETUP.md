# CodeForge AI — Complete Setup, Usage & Testing Guide

---

## What Is Each Component?

| Component | What it does |
|-----------|-------------|
| **Frontend** (React + Vite) | The web UI at localhost:5173 — chat, repos, dashboard |
| **Node API** (Express) | AI streaming, model routing, WebSocket (port 3000) |
| **Python Backend** (FastAPI) | MongoDB, auth, search, WhatsApp webhook (port 9000) |
| **CLI** (`cf` command) | Use CodeForge AI entirely from your terminal — no browser needed |
| **VS Code Extension** | AI code suggestions directly inside VS Code |
| **WhatsApp Bot** | Chat with CodeForge AI on WhatsApp |

---

## Part 1 — Web App

### 1.1 Prerequisites

Install once:
- Node.js 18/20 LTS — https://nodejs.org
- Python 3.11+ — https://python.org/downloads
- Git — https://git-scm.com

### 1.2 Clone & Setup .env Files

```cmd
git clone https://github.com/yathik-2622/CodeForge-AI.git
cd CodeForge-AI
```

Create `backend\.env`:
```
MONGODB_URL=mongodb+srv://USER:PASS@cluster.mongodb.net
MONGODB_DB=codeforge
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
GITHUB_CLIENT_ID=your_github_oauth_app_id
GITHUB_CLIENT_SECRET=your_github_oauth_secret
SESSION_SECRET=any-random-32-char-string
TAVILY_API_KEY=tvly-...
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
PORT=9000
FRONTEND_URL=http://localhost:5173
```

Create `node_api\.env`:
```
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
PORT=3000
```

Create `frontend\.env`:
```
VITE_API_URL=http://localhost:3000
VITE_PYTHON_API_URL=http://localhost:9000
```

### 1.3 Install Dependencies

Open 3 CMD windows:

**Window 1:**
```cmd
cd CodeForge-AI\frontend
npm install
```

**Window 2:**
```cmd
cd CodeForge-AI\node_api
npm install
```

**Window 3:**
```cmd
cd CodeForge-AI\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 1.4 Start All Services

**Window 1 — Frontend:**
```cmd
cd CodeForge-AI\frontend
npm run dev
```
→ http://localhost:5173

**Window 2 — Node API:**
```cmd
cd CodeForge-AI\node_api
npm run dev
```
→ port 3000 running

**Window 3 — Python Backend:**
```cmd
cd CodeForge-AI\backend
.venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```
→ MongoDB Atlas connected

### 1.5 Test the Web App

| Test | URL | Expected result |
|------|-----|-----------------|
| App loads | http://localhost:5173 | Dashboard visible |
| Node API health | http://localhost:3000/api/healthz | `{"status":"ok"}` |
| All 23 models | http://localhost:3000/api/models | JSON array |
| Python health | http://localhost:9000/api/health | all services shown |
| Python models | http://localhost:9000/api/models | JSON array |
| FastAPI Swagger | http://localhost:9000/docs | Interactive API docs |
| Web search | http://localhost:9000/api/search/web?q=python | search results |

**Test AI Chat:**
1. Open http://localhost:5173
2. Click Chat in sidebar
3. Type: "Write a Python function to sort a list"
4. Should stream a response using the selected model

**Test Model Selector:**
1. In the chat UI, click the model dropdown
2. Switch to "Llama 4 Maverick" (Groq)
3. Send a message — response should come back faster

---

## Part 2 — CLI (`cf` command)

### What is the CLI?

The CLI lets you use CodeForge AI **entirely from your terminal** without opening a browser. Think of it like Claude Code or GitHub Copilot for your command line. You can:
- Have a full AI conversation about your code
- Ask it to fix bugs in a file
- Explain how any code works
- Analyze your whole project for issues
- Auto-generate commit messages
- Run a command and have AI automatically fix it if it fails

### 2.1 Install the CLI

```cmd
cd CodeForge-AI\cli
npm install
npm run build
npm link
```

Verify:
```cmd
cf --version
cf status
```

### 2.2 Setup API Keys for CLI

The CLI reads keys from environment variables or `~/.codeforge/config.json`.

Set them once (Windows PowerShell):
```powershell
$env:OPENROUTER_API_KEY="sk-or-v1-..."
$env:GROQ_API_KEY="gsk_..."
```

Or permanently (Windows):
1. Search "Environment Variables" in Start
2. User Variables → New
3. Name: `OPENROUTER_API_KEY`, Value: your key
4. Repeat for `GROQ_API_KEY`

### 2.3 CLI Commands & How to Use Each

#### Interactive Chat (main mode)
```cmd
cf
```
This is the main mode — like Claude Code. It:
- Loads all your project files as context automatically
- You can have a back-and-forth conversation
- It knows about your codebase from the start

Slash commands inside chat:
```
/models        → list all 23 AI models
/model groq/llama-3.3-70b-versatile  → switch model
/clear         → clear conversation
/status        → show git status
/exit          → quit
```

Example session:
```
cf
> You › What does this project do?
> CF  › This is CodeForge AI, an autonomous coding agent platform...

> You › Add error handling to backend/app/routes/auth.py
> CF  › Here's the updated file with try/catch blocks...
```

#### One-shot Ask
```cmd
cf ask "What is the difference between async and sync in Python?"
cf ask "Write a regex to validate an email address"
```
Gets an answer immediately, no REPL.

#### Fix a File
```cmd
cf fix backend/app/db/mongo.py
cf fix frontend/src/lib/api.ts --issue "null pointer on line 45"
cf fix src/auth.ts --apply        (apply without asking)
```
Shows a diff of changes, asks you to apply.

#### Explain Code
```cmd
cf explain backend/app/agents/graph.py
cf explain backend/app/agents/graph.py --expert
cf explain README.md --simple
```

#### Analyze Project
```cmd
cf analyze .                   (whole project)
cf analyze src/api.ts          (single file)
cf analyze . --security        (find security issues)
cf analyze . --perf            (find performance issues)
```

#### AI Commit Messages
```cmd
cf commit              (analyze current diff → generate message → ask to commit)
cf commit --all        (stage everything first, then commit)
```

#### Run Command with Auto-Fix
```cmd
cf run "npm test"
cf run "npm test" --watch          FULLY AUTONOMOUS — keeps fixing until tests pass
cf run "cargo build" --fix         auto-apply all fixes, ask before retrying
cf run "pytest" --max-attempts 5
```

**How `--watch` works:**
1. Runs `npm test`
2. If it fails, AI reads the error and all mentioned files
3. AI suggests `<fix file="src/auth.ts">...fixed code...</fix>` blocks
4. CLI writes the fixes automatically
5. Re-runs `npm test`
6. Repeats until all tests pass or max attempts reached

### 2.4 Test the CLI

```cmd
cf status                          should show API keys and server status
cf models                          should list 23 models
cf ask "hello, are you working?"   should get AI response
cf run "echo hello world"          should succeed immediately
cf run "node this-does-not-exist.js" --fix  AI diagnoses the error
```

---

## Part 3 — VS Code Extension

### What does it do?
The VS Code extension adds CodeForge AI directly inside VS Code:
- AI code completions as you type
- Right-click → "Ask CodeForge AI" on any selection
- Sidebar chat panel
- Model selector in the status bar

### 3.1 Install

**Option A — Local install from source:**
```cmd
cd CodeForge-AI\vscode-extension
npm install
npm run build
```

Then in VS Code:
1. Press `Ctrl+Shift+P`
2. Type: "Extensions: Install from VSIX"
3. Navigate to `vscode-extension/out/` and select the `.vsix` file

**Option B — Install vsce and package it:**
```cmd
npm install -g vsce
cd CodeForge-AI\vscode-extension
vsce package
vscode --install-extension codeforge-ai-*.vsix
```

### 3.2 Configure the Extension

1. Open VS Code Settings (`Ctrl+,`)
2. Search "CodeForge"
3. Set:
   - `codeforge.apiUrl`: `http://localhost:3000`
   - `codeforge.openrouterKey`: your key (or use env var)
   - `codeforge.model`: `groq/llama-3.3-70b-versatile`

### 3.3 Test the Extension

1. Open any `.ts` or `.py` file in VS Code
2. Select a block of code
3. Right-click → "CodeForge AI: Explain Selection"
4. Should open a panel with AI explanation

5. Press `Ctrl+Shift+P` → "CodeForge: Open Chat"
6. Type a question — AI should respond

---

## Part 4 — WhatsApp Integration

### How it works
When someone messages your WhatsApp number, Twilio forwards it to your backend (`/api/whatsapp/webhook`). Your backend processes it with AI and sends the reply back via Twilio.

### 4.1 Get Twilio Account

1. Sign up free at https://www.twilio.com/try-twilio
2. Go to Console → Account Info → copy:
   - Account SID (starts with `AC`)
   - Auth Token

### 4.2 Enable WhatsApp Sandbox

1. Console → Messaging → Try it out → Send a WhatsApp message
2. You'll see a sandbox number like `+1 415 523 8886`
3. Scan the QR code or send the join code from your phone to activate

### 4.3 Set Your Webhook URL

Your backend must be publicly accessible. Use ngrok for local testing:

```cmd
ngrok http 9000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

In Twilio Console → Messaging → Settings → WhatsApp Sandbox Settings:
- Webhook URL: `https://abc123.ngrok.io/api/whatsapp/webhook`
- Method: POST

### 4.4 Add Env Vars & Restart Backend

In `backend\.env`:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Restart:
```cmd
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

Check health: http://localhost:9000/api/health → `"whatsapp": "configured"`

### 4.5 Set Display Name to "CodeForge AI"

**For Sandbox (testing):** The name shows as "Twilio Sandbox" — you cannot change it.

**For Production (real WhatsApp Business number):**
1. Apply for a WhatsApp Business Account at https://business.whatsapp.com
2. In Twilio Console → Messaging → Senders → WhatsApp Senders → Add Sender
3. During registration, set **Display Name**: `CodeForge AI`
4. Submit for Meta approval (takes 1-3 days)
5. Once approved, messages will show "CodeForge AI" as the sender name

### 4.6 Test WhatsApp

From your phone (after joining the sandbox):
1. Send: `hi` → should get welcome message
2. Send: `write a hello world in python` → AI responds with code
3. Send: `/help` → shows available commands
4. Send: `/new` → starts a fresh session
5. Send: `explain what is async/await` → full AI explanation

**Commands users can send:**
| Message | Response |
|---------|----------|
| `hi` or `/start` | Welcome message |
| `/help` | List all commands |
| `/new` | Start fresh conversation |
| `/history` | Show last messages |
| Any question | AI responds with CodeForge |

---

## Quick Reference

### Start Everything
```cmd
REM Terminal 1
cd frontend && npm run dev

REM Terminal 2  
cd node_api && npm run dev

REM Terminal 3
cd backend && .venv\Scripts\activate && python -m uvicorn main:app --port 9000 --reload
```

### Health Check URLs
| URL | Expected |
|-----|----------|
| http://localhost:5173 | Web app |
| http://localhost:3000/api/healthz | `{"status":"ok"}` |
| http://localhost:3000/api/models | 23 models |
| http://localhost:9000/api/health | all services |
| http://localhost:9000/docs | Swagger UI |

### CLI Cheatsheet
```cmd
cf                      Interactive chat
cf ask "question"       Quick answer
cf fix file.ts          AI fix
cf explain file.ts      Explain code
cf analyze .            Audit project
cf commit               AI commit msg
cf run "cmd" --watch    Run + auto-fix loop
cf models               List 23 models
cf status               Check connections
```

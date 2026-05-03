# CodeForge AI — Complete Setup, Testing & Usage Guide

---

## Architecture Overview

| Component | What it does | Port |
|-----------|-------------|------|
| **Frontend** (React + Vite) | Web dashboard — chat, repos, model selector | 5173 |
| **Node API** (Express) | AI streaming, model routing, sessions | 3000 |
| **Python Backend** (FastAPI) | MongoDB, auth, search, WhatsApp webhook | 9000 |
| **CLI** (`cf`) | Full AI coding agent in your terminal | — |
| **VS Code Extension** | AI assistance inside VS Code | — |
| **WhatsApp Bot** | Chat with CodeForge AI on WhatsApp | — |

---

## Part 1 — Web App

### 1.1 Clone & Create .env Files

```cmd
git clone https://github.com/yathik-2622/CodeForge-AI.git
cd CodeForge-AI
```

**`backend\.env`**
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

**`node_api\.env`**
```
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
PORT=3000
```

**`frontend\.env`**
```
VITE_API_URL=http://localhost:3000
VITE_PYTHON_API_URL=http://localhost:9000
```

### 1.2 Install & Start (3 CMD windows)

**Window 1 — Frontend**
```cmd
cd CodeForge-AI\frontend
npm install
npm run dev
```
→ Open http://localhost:5173

**Window 2 — Node API**
```cmd
cd CodeForge-AI\node_api
npm install
npm run dev
```
→ `Server listening on port 3000`

**Window 3 — Python Backend**
```cmd
cd CodeForge-AI\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```
→ `✅ MongoDB Atlas connected`

### 1.3 Test the Web App

| What to test | URL | Expected |
|---|---|---|
| App loads | http://localhost:5173 | Dashboard |
| Node health | http://localhost:3000/api/healthz | `{"status":"ok"}` |
| 23 models | http://localhost:3000/api/models | JSON array |
| Python health | http://localhost:9000/api/health | all services |
| Python models | http://localhost:9000/api/models | JSON array |
| Swagger docs | http://localhost:9000/docs | Interactive docs |
| Web search | http://localhost:9000/api/search/web?q=python | results |

**Test AI Chat:**
1. Open http://localhost:5173 → Click "Chat"
2. Type: `Write a Python function to sort a list by length`
3. Should stream a response using the selected model

**Test Model Selector:**
1. In chat, click the model dropdown
2. Switch to `Llama 4 Maverick` (Groq)
3. Send a message — Groq responds much faster (~200ms)

**Test GitHub Auth:**
1. Click "Sign in with GitHub" on the app
2. Should redirect to GitHub → back to app with your profile

---

## Part 2 — CLI (`cf` command)

### What is the CLI?

The CLI lets you use CodeForge AI entirely from your **terminal** — no browser needed. Think of it like Claude Code or GitHub Copilot CLI. It can:

- Chat with AI about your code in an interactive session
- Fix bugs in files automatically (shows a diff, you approve)
- Explain any code file in plain English
- Audit your whole project for bugs and security issues
- Auto-generate git commit messages from your diff
- Run any command and auto-fix it if it fails — fully autonomously

### 2.1 Install

```cmd
cd CodeForge-AI\cli
npm install
npm run build
npm link
```

Verify:
```cmd
cf --version
```

### 2.2 Set API Keys (Required First)

The CLI needs your API keys saved to `C:\Users\YOU\.codeforge\config.json`:

```cmd
cf config --openrouter-key sk-or-v1-YOUR_KEY_HERE
cf config --groq-key gsk_YOUR_KEY_HERE
```

Verify keys are saved:
```cmd
cf config
```
Should show `✓ set` for both keys.

### 2.3 All CLI Commands

#### Interactive Chat — like Claude Code
```cmd
cf
```
Opens an AI chat session. The AI knows your project files automatically.

Inside the session, type:
```
/models                              list all 23 models
/model groq/llama-3.3-70b-versatile  switch to a faster model
/clear                               clear conversation
/status                              show git status
/exit                                quit
```

Example:
```
cf
> You › What does this project do?
> CF  › This is CodeForge AI, an autonomous coding agent platform...
> You › Add error handling to backend/app/routes/auth.py
> CF  › Here's the updated auth.py with try/except blocks...
```

#### One-shot Question
```cmd
cf ask "What is the difference between async and await in Python?"
cf ask "Write a regex to validate email addresses"
cf ask "How do I make a POST request with fetch?"
```

#### Fix a File
```cmd
cf fix backend/app/routes/search.py
cf fix frontend/src/lib/api.ts --issue "null pointer on line 45"
cf fix src/auth.ts --apply                   (auto-apply without prompt)
```
Shows a colored diff of what changed, asks you to apply.

#### Explain Code
```cmd
cf explain backend/app/agents/graph.py
cf explain backend/app/agents/graph.py --expert
cf explain README.md --simple
```

#### Analyze Project
```cmd
cf analyze .                   entire project
cf analyze backend/             just backend
cf analyze . --security         find security vulnerabilities
cf analyze . --perf             find performance problems
```

#### Auto-Generate Commit Message
```cmd
cf commit              reads your diff → generates message → ask to commit
cf commit --all        stages everything first, then commits
```

#### Run Command with Auto-Fix Loop
```cmd
cf run "npm test"
cf run "npm test" --watch          AUTONOMOUS — keeps fixing until tests pass
cf run "cargo build" --fix         auto-apply all fixes, ask before retrying
cf run "pytest" --max-attempts 5   retry up to 5 times
```

**How `--watch` works:**
1. Runs `npm test`
2. If it fails → AI reads the error output + all mentioned files
3. AI generates fixes in `<fix file="path">...code...</fix>` format
4. CLI writes all fixes to disk automatically (no prompts)
5. Re-runs `npm test`
6. Loops until tests pass or max attempts reached

#### Switch Model
```cmd
cf config --model groq/llama-3.3-70b-versatile
cf config --model mistralai/mistral-7b-instruct:free
```

### 2.4 Test the CLI

```cmd
cf config                              check keys are set
cf status                              all services online
cf models                              23 models listed
cf ask "hello, are you working?"       AI responds
cf run "echo hello world" --watch      passes immediately
cf run "node doesnt-exist.js" --fix    AI diagnoses the error
```

---

## Part 3 — VS Code Extension

### What Does It Do?

Adds CodeForge AI directly inside VS Code:
- Right-click any code → "CodeForge: Ask/Fix/Explain/Generate Tests/Refactor"
- Sidebar chat panel — persistent AI conversation
- Session history — browse past conversations
- Model selector — switch between all 23 models from inside VS Code
- Keyboard shortcuts — no mouse needed

### 3.1 Prerequisites

Install these if you don't have them:
```cmd
node --version     should be 18+
```

### 3.2 Build the Extension

```cmd
cd CodeForge-AI\vscode-extension
npm install
npm run compile
```

This creates `dist/extension.js`.

### 3.3 Package into .vsix

```cmd
cd CodeForge-AI\vscode-extension
npx vsce package --no-dependencies
```

This creates `codeforge-ai-0.1.0.vsix` in the same folder.

### 3.4 Install in VS Code

**Method A — Command line:**
```cmd
code --install-extension codeforge-ai-0.1.0.vsix
```

**Method B — VS Code UI:**
1. Press `Ctrl+Shift+P`
2. Type: `Extensions: Install from VSIX`
3. Navigate to `vscode-extension\` folder
4. Select `codeforge-ai-0.1.0.vsix`
5. Click Install
6. Click Reload Window when prompted

### 3.5 Configure the Extension

1. Open VS Code Settings (`Ctrl+,`)
2. Search `codeforge`
3. Set:
   - **Server URL**: `http://localhost:3000` (your running node_api)
   - **Model**: choose from the dropdown — all 23 models listed

The extension connects to your running node_api server for all AI requests.

### 3.6 How to Use the Extension

**Sidebar Chat:**
- Click the CodeForge icon in the left activity bar (looks like the convergence logo)
- Type your question in the chat box
- AI responds in the panel

**Right-click on code:**
1. Open any `.ts`, `.py`, `.js` file
2. Select some code
3. Right-click → you'll see the CodeForge AI menu:
   - `Ask About Selection` — explain what this code does
   - `Fix This Code` — AI fixes bugs in your selection
   - `Explain Selection` — detailed explanation
   - `Generate Tests` — writes unit tests for your code
   - `Refactor Selection` — cleaner/more idiomatic version

**Keyboard Shortcuts:**
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Open chat |
| `Ctrl+Shift+M` | Switch model |
| `Ctrl+Shift+Q` | Ask about selected code |
| `Ctrl+Shift+F` | Fix selected code |

**Switch Model:**
- Press `Ctrl+Shift+M`
- Searchable dropdown of all 23 models appears
- Groq models are labeled "Groq · Ultra-fast"
- OpenRouter models are labeled "OpenRouter · Free"

### 3.7 Test the Extension

1. Make sure `node_api` is running on port 3000
2. Open any code file in VS Code
3. Select a function → right-click → "CodeForge: Explain Selection"
4. Should open chat panel with AI explanation
5. Press `Ctrl+Shift+M` → should show model picker dropdown
6. Press `Ctrl+Shift+A` → should open chat sidebar

### 3.8 Troubleshooting the Extension

**Extension not showing in sidebar:** Reload VS Code (`Ctrl+Shift+P` → "Reload Window")

**"Cannot connect to server" error:** Make sure node_api is running (`cd node_api && npm run dev`)

**Rebuild after code changes:**
```cmd
cd vscode-extension
npm run compile
npx vsce package --no-dependencies
code --install-extension codeforge-ai-0.1.0.vsix
```

---

## Part 4 — WhatsApp Integration

### How It Works

When someone sends a WhatsApp message to your Twilio number, Twilio calls your backend (`/api/whatsapp/webhook`). Your backend processes it with AI and sends the reply back via Twilio.

### 4.1 Get Twilio Account

1. Sign up free at https://www.twilio.com/try-twilio
2. Go to Console → Account Info → copy:
   - **Account SID** (starts with `AC`)
   - **Auth Token**

### 4.2 Enable WhatsApp Sandbox

1. Console → Messaging → Try it out → "Send a WhatsApp message"
2. Note the sandbox number: `+1 415 523 8886`
3. From your phone, send the join code shown on screen to that number
4. You'll get a confirmation message

### 4.3 Expose Backend Publicly (for local testing)

Your backend must be reachable from the internet. Use ngrok:

```cmd
ngrok http 9000
```

Copy the HTTPS URL shown: `https://abc123.ngrok-free.app`

### 4.4 Set Webhook in Twilio

1. Console → Messaging → Settings → WhatsApp Sandbox Settings
2. Set "When a message comes in": `https://abc123.ngrok-free.app/api/whatsapp/webhook`
3. Method: `POST`
4. Click Save

### 4.5 Add Env Vars to Backend

In `backend\.env`, add:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Restart backend:
```cmd
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

Check http://localhost:9000/api/health → should show `"whatsapp": "configured"`

### 4.6 Set Display Name to "CodeForge AI"

**Sandbox (testing):** Name shows as "Twilio Sandbox" — cannot change this.

**Production (real WhatsApp Business number):**
1. Apply at https://business.whatsapp.com
2. In Twilio Console → Messaging → Senders → WhatsApp Senders → Add Sender
3. Set **Display Name**: `CodeForge AI`
4. Submit for Meta approval (1-3 business days)
5. After approval, all messages show "CodeForge AI" as the sender

### 4.7 Test WhatsApp

From your phone (after joining the sandbox):

| Send this | Get this |
|-----------|----------|
| `hi` or `/start` | Welcome message from CodeForge AI |
| `/help` | List of all commands |
| `/new` | Start a fresh AI session |
| `write a hello world in python` | AI responds with Python code |
| `explain async/await in javascript` | Full AI explanation |
| `/history` | See your last few messages |

---

## Quick Reference

### Start Everything
```cmd
REM Window 1 — Frontend
cd CodeForge-AI\frontend && npm run dev

REM Window 2 — Node API
cd CodeForge-AI\node_api && npm run dev

REM Window 3 — Python Backend
cd CodeForge-AI\backend && .venv\Scripts\activate && python -m uvicorn main:app --port 9000 --reload
```

### All Test URLs
| URL | Expected |
|-----|----------|
| http://localhost:5173 | Web app |
| http://localhost:3000/api/healthz | `{"status":"ok"}` |
| http://localhost:3000/api/models | 23 models |
| http://localhost:9000/api/health | all services |
| http://localhost:9000/docs | Swagger UI |

### CLI Cheatsheet
```cmd
cf config --openrouter-key sk-or-v1-...   save OpenRouter key
cf config --groq-key gsk_...              save Groq key
cf                                        interactive chat
cf ask "question"                         quick answer
cf fix file.ts                            AI fix with diff
cf explain file.ts                        explain code
cf analyze .                              audit project
cf commit                                 AI commit message
cf run "cmd" --watch                      run + auto-fix loop
cf models                                 list 23 models
cf status                                 check connections
```

### VS Code Extension Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl+Shift+A` | Open chat |
| `Ctrl+Shift+M` | Switch model |
| `Ctrl+Shift+Q` | Ask about selection |
| `Ctrl+Shift+F` | Fix selection |

# CodeForge AI — Full Setup Guide

> **Everything you need to go from zero to a fully running CodeForge AI — step by step.**
> No coding experience required. Every command is copy-paste ready.

---

## Table of Contents

1. [What You Will Have](#1-what-you-will-have)
2. [Install Required Programs](#2-install-required-programs)
3. [Get the Code](#3-get-the-code)
4. [Get Your Free API Keys](#4-get-your-free-api-keys)
5. [Configure the Backend](#5-configure-the-backend)
6. [Install All Dependencies](#6-install-all-dependencies)
7. [Run the App](#7-run-the-app)
8. [Test Every Feature](#8-test-every-feature)
9. [VS Code Extension](#9-vs-code-extension)
10. [CLI Tool](#10-cli-tool)
11. [WhatsApp Integration](#11-whatsapp-integration)
12. [Instagram Integration](#12-instagram-integration)
13. [Stop and Restart](#13-stop-and-restart)
14. [Troubleshooting](#14-troubleshooting)
15. [Deploy to Production](#15-deploy-to-production)

---

## 1. What You Will Have

After completing this guide, your computer will be running:

```
Your Computer
│
├── React Frontend    →  http://localhost:5173   ← the website you open in a browser
├── Python Backend    →  http://localhost:9000   ← the AI brain (FastAPI + LangGraph)
├── Express API       →  http://localhost:8080   ← TypeScript helper API
└── MongoDB           →  mongodb://localhost:27017 ← database for chat sessions
```

**What CodeForge AI can do:**
- Chat with AI that writes, explains, and fixes code (streams word by word)
- Multi-agent pipeline: Supervisor routes tasks to Researcher or Coder agents
- Search the web in real time while answering your questions
- Connect GitHub repos and let AI scan and understand your codebase
- Collaborate in real time — multiple people in the same session
- Chat via WhatsApp or Instagram DMs
- Use it inside VS Code with a sidebar panel
- Use it from the terminal with a CLI tool

---

## 2. Install Required Programs

Install these in order. Each step includes how to verify it worked.

---

### Node.js (v20 or newer)

**What it is:** Runs the frontend and TypeScript backend.

**Install:**
- Visit https://nodejs.org
- Download the **LTS** version ("Recommended for most users")
- Run the installer — click Next through everything
- **Windows:** Restart your terminal after installing

**Verify:**
```bash
node --version
```
Expected output: `v20.x.x` or higher

---

### pnpm

**What it is:** Package manager for the JavaScript/TypeScript parts.

**Install (run this in your terminal after Node.js):**
```bash
npm install -g pnpm
```

**Verify:**
```bash
pnpm --version
```
Expected output: `9.x.x` or higher

---

### Python 3.11 or newer

**What it is:** The AI backend is written in Python.

**Install:**
- Visit https://python.org/downloads
- Download **Python 3.11** or newer
- **Windows:** During installation, check ✅ "Add Python to PATH" — this is critical!
- **macOS:** Either use the python.org installer, or if you have Homebrew: `brew install python@3.11`
- **Linux (Ubuntu/Debian):** `sudo apt install python3.11 python3-pip`

**Verify:**
```bash
python3 --version
```
Expected output: `Python 3.11.x` or higher

---

### MongoDB Community Edition

**What it is:** The database that stores your chat sessions and messages.

**Option A — Install locally (recommended):**
- Visit https://www.mongodb.com/try/download/community
- Select your OS, download, run the installer
- **Windows:** During installation, check "Install MongoDB as a Service" so it starts automatically
- **macOS with Homebrew:**
  ```bash
  brew tap mongodb/brew
  brew install mongodb-community
  brew services start mongodb-community
  ```
- **Linux (Ubuntu):**
  ```bash
  sudo apt install -y mongodb
  sudo systemctl start mongod
  sudo systemctl enable mongod
  ```

**Option B — Free cloud (no installation needed):**
- Visit https://www.mongodb.com/cloud/atlas
- Sign up for free (no credit card needed)
- Create a free **M0** cluster
- Click "Connect" → "Connect your application" → copy the connection string
- You will use this string as `MONGODB_URL` in Step 5

**Verify local MongoDB:**
```bash
# macOS/Linux
mongosh --eval "db.adminCommand('ping')"
# Expected: { ok: 1 }

# Windows: Open MongoDB Compass (installed with MongoDB) and click Connect
```

---

### Git

**What it is:** Used to download the code.

**Install:**
- Visit https://git-scm.com/downloads
- Download and install for your OS

**Verify:**
```bash
git --version
```
Expected output: `git version 2.x.x`

---

## 3. Get the Code

**If you downloaded the ZIP from Replit:**
1. Unzip the file `codeforge-full.zip`
2. Open a terminal inside the unzipped folder

**If you pushed to GitHub from Replit:**
```bash
git clone https://github.com/YOUR_USERNAME/codeforge-ai.git
cd codeforge-ai
```

**Confirm you are in the right folder:**
```bash
ls
```
You should see: `artifacts/`, `backend/`, `docs/`, `tools/`, `package.json`, `pnpm-workspace.yaml`

---

## 4. Get Your Free API Keys

You need these to unlock the features. All are free — no credit card required.

---

### OpenRouter API Key — REQUIRED (powers all AI)

OpenRouter gives you access to free AI models: Mistral 7B, Llama 3 8B, Phi-3, Gemma 3.

1. Visit https://openrouter.ai
2. Click "Sign In" and create a free account
3. Visit https://openrouter.ai/keys
4. Click "Create Key" — give it any name (e.g. "CodeForge")
5. Copy the key — it starts with `sk-or-`

> Keep this key private. Never commit it to Git.

---

### GitHub OAuth App — REQUIRED (for "Sign in with GitHub")

1. Visit https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** `CodeForge AI`
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:9000/api/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** shown on the page
6. Click "Generate a new client secret"
7. Copy the **Client Secret** — only shown once, copy it immediately

---

### Tavily API Key — OPTIONAL (enables web search)

Lets the AI search the internet when answering questions.
Free tier: 1,000 searches/month.

1. Visit https://tavily.com
2. Sign up free
3. Your API key is shown on the dashboard — starts with `tvly-`

---

### Twilio — OPTIONAL (for WhatsApp + Instagram)

Only needed if you want WhatsApp or Instagram DM integration.

1. Visit https://twilio.com
2. Sign up for a free trial (includes $15 free credit)
3. In the Twilio Console, find:
   - **Account SID** (on the dashboard homepage)
   - **Auth Token** (on the dashboard homepage, click to reveal)
4. For WhatsApp: Messaging → Try it out → Send a WhatsApp message → follow sandbox setup
5. Copy the **WhatsApp sandbox number** (looks like `+14155238886`)

---

## 5. Configure the Backend

```bash
# Go into the backend folder
cd backend

# Copy the example environment file
cp .env.example .env
```

Now open the `.env` file in any text editor (Notepad, VS Code, TextEdit) and fill in your values:

```env
# ─────────────────────────────────────────────────────────
# REQUIRED — the app will not work without these
# ─────────────────────────────────────────────────────────

# Generate a random secret (run this command, copy the output):
# python3 -c "import secrets; print(secrets.token_hex(32))"
SESSION_SECRET=paste-your-generated-64-character-string-here

# Your OpenRouter key from Step 4
OPENROUTER_API_KEY=sk-or-your-key-here

# MongoDB — use this if you installed MongoDB locally
MONGODB_URL=mongodb://localhost:27017

# MongoDB — use this instead if you are using Atlas cloud
# MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/codeforge

# ─────────────────────────────────────────────────────────
# GITHUB LOGIN — fill in to enable "Sign in with GitHub"
# ─────────────────────────────────────────────────────────

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
APP_URL=http://localhost:9000
FRONTEND_URL=http://localhost:5173

# ─────────────────────────────────────────────────────────
# OPTIONAL — features work without these, just disabled
# ─────────────────────────────────────────────────────────

# Web search for the AI
TAVILY_API_KEY=tvly-your-key-here

# WhatsApp via Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Instagram via Twilio
TWILIO_INSTAGRAM_FROM=your-instagram-page-id

# Qdrant cloud (optional — in-memory works fine for local use)
# QDRANT_URL=https://your-cluster.qdrant.io
# QDRANT_API_KEY=your-qdrant-key

# AI model to use (these are all free on OpenRouter)
AI_MODEL=mistralai/mistral-7b-instruct:free
# Other free options:
# meta-llama/llama-3-8b-instruct:free
# microsoft/phi-3-mini-128k-instruct:free
# google/gemma-3-12b-it:free
```

**Save the file** — make sure there are no extra spaces around the `=` signs.

---

## 6. Install All Dependencies

You only need to do this once (or when dependencies change).

### JavaScript/TypeScript packages (frontend + Express API)

```bash
# Run from the root of the project (not inside backend/)
pnpm install
```

Wait for it to complete. It downloads all the JavaScript packages.

### Python packages (AI backend)

```bash
# Go into the backend folder
cd backend

# Install all Python packages
pip install -r requirements.txt

# If pip is not found, try:
pip3 install -r requirements.txt

# Or:
python3 -m pip install -r requirements.txt

# Go back to the project root
cd ..
```

---

## 7. Run the App

You need **two terminal windows open at the same time.**

### Terminal 1 — Python AI Backend

```bash
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

**You should see something like:**
```
⚡ CodeForge AI Backend Starting
✅ MongoDB connected (or: degraded mode if MongoDB not running)
✅ Qdrant ready (in-memory mode)
✅ All services ready — CodeForge AI is running!
   API docs: http://localhost:9000/docs
   Health:   http://localhost:9000/api/health
INFO:     Uvicorn running on http://0.0.0.0:9000
```

> If MongoDB is not running, the backend still starts in "degraded mode" — most features still work, chat sessions are stored in memory only.

### Terminal 2 — React Frontend

```bash
# From the project root (not inside backend/)
PORT=5173 pnpm --filter @workspace/codeforge run dev
```

**You should see:**
```
  VITE v5.x  ready in 800ms
  ➜  Local:   http://localhost:5173/
```

### Open in your browser

Visit: **http://localhost:5173**

You should see the CodeForge AI dashboard with a dark sidebar on the left.

---

## 8. Test Every Feature

Work through each test to confirm everything is working.

---

### Test 1 — Backend Health Check

Open in your browser: http://localhost:9000/api/health

Expected JSON response:
```json
{
  "status": "ok",
  "services": {
    "mongodb": "connected",
    "qdrant": "connected (in-memory)",
    "openrouter": "configured"
  }
}
```

If `openrouter` says `not set`, recheck your `.env` file.

---

### Test 2 — API Documentation

Open: http://localhost:9000/docs

You should see the Swagger UI showing every API endpoint.
You can test endpoints directly from this page.

---

### Test 3 — Collapsible Sidebar

1. Look at the top-right corner of the sidebar — there is a small panel/arrow icon
2. Click it — the sidebar shrinks to icon-only mode
3. Hover over any icon — a tooltip label appears
4. Click the icon again — the sidebar expands back to full width

---

### Test 4 — GitHub Login

1. Click **"Sign in with GitHub"** at the bottom of the sidebar
2. You are redirected to GitHub
3. Click "Authorize CodeForge AI"
4. You are redirected back — your GitHub avatar and username appear in the sidebar

If the redirect fails: double-check the callback URL in your GitHub OAuth App settings is exactly `http://localhost:9000/api/auth/github/callback`.

---

### Test 5 — Create a Chat Session

1. Click **"Chat"** in the sidebar
2. Click the **+** button or "New Session"
3. Name it "My First Session"
4. Click Create

Expected: The session appears in the list and opens automatically.

---

### Test 6 — Send a Message and Get AI Response

1. In the session, type:
   ```
   Write a Python function that reverses a string
   ```
2. Press Enter or click Send

Expected:
- Your message appears immediately
- A typing indicator shows (`...`)
- The AI response **streams in word by word** in real time
- The response includes formatted Python code with syntax highlighting

If nothing appears: check Terminal 1 (Python backend) for error messages.

---

### Test 7 — Web Search (requires Tavily key)

1. In any chat session, type:
   ```
   What are the latest features in Python 3.13?
   ```
2. Press Enter

Expected: The AI performs a web search and gives a current, up-to-date answer with sources.

If Tavily is not configured, the AI answers from its training data instead.

---

### Test 8 — Connect a GitHub Repository

1. Click **"Repositories"** in the sidebar
2. Click **"Connect Repository"** or the **+** button
3. Enter a public GitHub repo (e.g. `facebook/react` or `your-username/your-repo`)
4. Click Connect
5. Click **"Scan"** next to the repo

Expected: Status changes: `pending` → `scanning` → `ready`

Once ready, you can ask the AI questions about that codebase in the Chat.

---

### Test 9 — Real-time Collaboration (WebSocket)

1. Open a chat session
2. Copy the full URL from your browser address bar
3. Open a **new browser window** (or incognito tab)
4. Paste and open that URL
5. In the original window, type and send a message

Expected:
- Both windows show the streaming AI response simultaneously
- A small avatar indicator appears showing "2 participants" in the session

---

### Test 10 — Security Scanner

1. Click **"Security"** in the sidebar
2. Connect a repository first (Test 8)
3. Click "Run Security Scan" on the repo

Expected: A list of security findings appears, tagged by severity (critical, high, medium, low).

---

### Test 11 — Deployments Page

1. Click **"Deployments"** in the sidebar
2. View the deployment history and metrics

---

### Test 12 — Instagram Page

1. Click **"Instagram"** in the sidebar
2. Verify the setup guide loads with:
   - "How It Works" section with 3 steps
   - Your webhook URL displayed in a copyable box
   - Step-by-step setup instructions

---

## 9. VS Code Extension

The VS Code extension puts CodeForge AI directly inside your editor.

### Build the Extension

```bash
# Go into the extension folder
cd tools/vscode-ext

# Install dependencies
npm install

# Build the extension
npm run build

# Package it into a .vsix file
npm run package
```

This creates `codeforge-ai-1.0.0.vsix` in the same folder.

### Install the Extension

```bash
# Install it into VS Code
code --install-extension codeforge-ai-1.0.0.vsix
```

Or manually:
1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions panel)
3. Click the `...` menu at the top → "Install from VSIX"
4. Select the `codeforge-ai-1.0.0.vsix` file

### Configure the Extension

1. Press `Ctrl+Shift+P` to open the Command Palette
2. Type: `CodeForge AI: Set Server URL`
3. Enter: `http://localhost:9000`
4. Press Enter

### Open the Sidebar

- Click the **⚡ lightning bolt icon** in the VS Code Activity Bar (left edge)
- Or press `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`)

### Use AI on Your Code

1. Select any code in the editor
2. Right-click → **CodeForge AI** submenu
3. Choose an action:

| Action | What it does |
|--------|-------------|
| Explain Selected Code | Explains what the code does in plain English |
| Fix Selected Code | Rewrites the code to fix bugs or errors |
| Generate Tests | Writes unit tests for the selected function |
| Send Selection to AI | Sends code to the chat with a custom question |

### Keyboard Shortcuts

| Shortcut (Windows/Linux) | Shortcut (Mac) | Action |
|--------------------------|----------------|--------|
| `Ctrl+Shift+A` | `Cmd+Shift+A` | Open CodeForge sidebar |
| `Ctrl+Shift+E` | `Cmd+Shift+E` | Explain selected code |
| `Ctrl+Shift+F` | `Cmd+Shift+F` | Fix selected code |

### Change AI Model

1. Open VS Code Settings (`Ctrl+,`)
2. Search for "codeforge"
3. Change **CodeForge: Model** to any free model:
   - `mistralai/mistral-7b-instruct:free`
   - `meta-llama/llama-3-8b-instruct:free`
   - `microsoft/phi-3-mini-128k-instruct:free`
   - `google/gemma-3-12b-it:free`

---

## 10. CLI Tool

Use CodeForge AI from your terminal — no browser needed.

### Build and Install the CLI

```bash
# Go into the CLI folder
cd tools/cli

# Install dependencies
npm install

# Build it
npm run build

# Go back to root
cd ../..

# Install it globally so you can use "codeforge" anywhere
npm install -g ./tools/cli
```

**Verify installation:**
```bash
codeforge --version
# or use the short alias:
cf --version
```

### Configure the CLI

```bash
codeforge config --server http://localhost:9000
codeforge status
```

Expected from `status`:
```
✅ Connected to CodeForge AI at http://localhost:9000
   MongoDB: connected
   Qdrant:  connected (in-memory)
   AI:      mistralai/mistral-7b-instruct:free
```

### CLI Commands

| Command | What it does |
|---------|-------------|
| `codeforge chat` | Opens interactive chat mode (like a terminal chatbot) |
| `codeforge chat "your question"` | One-shot question — prints answer and exits |
| `codeforge search "topic"` | Web search using Tavily |
| `codeforge repos` | Lists all connected GitHub repositories |
| `codeforge sessions` | Lists all your chat sessions |
| `codeforge models` | Lists available AI models |
| `codeforge config --server URL` | Sets the server URL |
| `codeforge status` | Shows connection and service status |

### Examples

```bash
# Ask a coding question
codeforge chat "How do I reverse a list in Python?"

# Search the web
codeforge search "React 19 new features"

# Start interactive chat
codeforge chat
# Then type messages and press Enter
# Type "exit" to quit

# List your repos
codeforge repos

# See your sessions
codeforge sessions
```

---

## 11. WhatsApp Integration

Chat with CodeForge AI through WhatsApp on your phone.

### Requirements
- A Twilio account (free trial at https://twilio.com)
- Your backend must be reachable from the internet (use ngrok for local testing)

### Step 1 — Expose Your Backend with ngrok

ngrok creates a public URL that points to your local backend.

```bash
# Install ngrok: https://ngrok.com/download
# Then run:
ngrok http 9000
```

You will see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:9000
```

Copy the `https://abc123.ngrok.io` URL — you will need it.

### Step 2 — Set Up Twilio WhatsApp Sandbox

1. Log in to https://console.twilio.com
2. Go to: Messaging → Try it out → Send a WhatsApp message
3. Follow the instructions to join the sandbox (send a code from your phone to the Twilio number)
4. In "Sandbox settings", set **"A message comes in"** to:
   ```
   https://abc123.ngrok.io/api/whatsapp/webhook
   ```
5. Click Save

### Step 3 — Add Twilio Keys to .env

Open `backend/.env` and fill in:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Step 4 — Restart the Backend

Press `Ctrl+C` in Terminal 1, then:
```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

### Step 5 — Test It

Send a WhatsApp message to the Twilio sandbox number from your phone.

**Supported commands via WhatsApp:**
- Any question → AI answers it
- `help` → shows available commands
- `sessions` → lists your sessions
- `new` → creates a new session

---

## 12. Instagram Integration

Chat with CodeForge AI through Instagram Direct Messages.

### Requirements
- An Instagram **Business** or **Creator** account (not a personal account)
- The Instagram account must be connected to a Facebook Page
- A Twilio account with Instagram messaging enabled

### Step 1 — Convert to Business Account (if needed)

1. Open Instagram → Settings → Account
2. Tap "Switch to Professional Account"
3. Select "Business" or "Creator"

### Step 2 — Connect Instagram to Facebook Page

1. Go to your Facebook Page → Settings → Instagram
2. Click "Connect Account"
3. Follow the prompts to link your Instagram Business account

### Step 3 — Enable Instagram in Twilio

1. In Twilio Console → Messaging → Senders → Instagram
2. Connect your Instagram Business account
3. Note the **Page ID** assigned

### Step 4 — Set Webhook URL in Twilio

In Twilio's Instagram channel settings, set:
- **"A message comes in"** URL: `https://abc123.ngrok.io/api/instagram/webhook`
- Click Save

### Step 5 — Add to .env

```env
TWILIO_INSTAGRAM_FROM=your-instagram-page-id
```

### Step 6 — Restart the Backend

```bash
# Press Ctrl+C first, then:
python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

### Test It

Send a DM to your Instagram Business account from any Instagram account.
The AI will reply automatically.

**Supported commands via Instagram DM:**
- Any question → AI answers it
- `help` → shows available commands

---

## 13. Stop and Restart

### Stop the app

In each terminal, press **Ctrl+C**.

### Start again

**Terminal 1:**
```bash
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

**Terminal 2:**
```bash
PORT=5173 pnpm --filter @workspace/codeforge run dev
```

### Tip: Make a startup script

Create a file called `start.sh` in the project root:
```bash
#!/bin/bash
echo "Starting CodeForge AI..."
cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload &
cd .. && PORT=5173 pnpm --filter @workspace/codeforge run dev
```

Make it executable and run it:
```bash
chmod +x start.sh
./start.sh
```

---

## 14. Troubleshooting

---

### "python3: command not found"
**Fix:** Python is not installed or not in your PATH.
- Windows: Reinstall Python from python.org and check ✅ "Add Python to PATH"
- macOS: Run `brew install python3`
- Linux: `sudo apt install python3`

---

### "pip: command not found" or "pip3: command not found"
**Fix:** Try these alternatives:
```bash
python3 -m pip install -r requirements.txt
```

---

### "pnpm: command not found"
**Fix:**
```bash
npm install -g pnpm
```
Then restart your terminal.

---

### "MongoDB connection refused"
**Fix:** MongoDB is not running. Start it:
```bash
# macOS with Homebrew:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod

# Windows: Open "Services" app → find "MongoDB Server" → click Start
```

If you don't want to install MongoDB, use MongoDB Atlas (free cloud) — see Step 2.

---

### "OPENROUTER_API_KEY not set" / AI responses are empty
**Fix:**
1. Open `backend/.env`
2. Make sure this line exists with your actual key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
   ```
3. No extra spaces, no quotes needed
4. Restart the backend

---

### GitHub login redirects to an error page
**Fix:** The callback URL in your GitHub OAuth App doesn't match.
1. Go to https://github.com/settings/developers
2. Click your OAuth App
3. Set "Authorization callback URL" to exactly:
   ```
   http://localhost:9000/api/auth/github/callback
   ```
   (Exact match required — no trailing slash)

---

### Frontend shows a blank page or won't load
**Fix:**
1. Make sure the backend is running first (Terminal 1)
2. Check Terminal 2 for error messages
3. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Open browser DevTools with `F12` → Console tab → look for red errors
5. Try a different browser

---

### "Port 9000 already in use"
**Fix:**
```bash
# macOS/Linux — find and kill the process:
lsof -ti:9000 | xargs kill

# Windows:
netstat -ano | findstr :9000
# Look for the PID number in the last column, then:
taskkill /PID <number> /F
```

---

### "Port 5173 already in use"
**Fix:**
```bash
# macOS/Linux:
lsof -ti:5173 | xargs kill

# Windows:
netstat -ano | findstr :5173
taskkill /PID <number> /F
```

---

### "ModuleNotFoundError" when starting backend
**Fix:** A Python package didn't install correctly.
```bash
cd backend
pip install -r requirements.txt --force-reinstall
```

---

### AI response appears but code blocks look broken
**Fix:** This is a display issue. Hard refresh the browser: `Ctrl+Shift+R`.

---

### VS Code extension not showing in the sidebar
**Fix:**
1. Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Make sure the extension was installed: `Ctrl+Shift+X` → search "CodeForge AI"
3. If not found, reinstall: `code --install-extension codeforge-ai-1.0.0.vsix`

---

## 15. Deploy to Production

To make CodeForge AI available on the internet (not just your computer):

### Option A — Replit Deploy (easiest)

1. In Replit, click the **Deploy** button (top right)
2. Replit handles hosting, HTTPS, and domain automatically
3. Your app is live at `your-app-name.replit.app`
4. Set your environment variables in Replit's Secrets panel (not in `.env`)

### Option B — Any VPS (DigitalOcean, Linode, Hetzner)

1. Get a VPS running Ubuntu
2. Clone your repo: `git clone ...`
3. Install Node.js, Python, MongoDB
4. Set environment variables: `export OPENROUTER_API_KEY=...`
5. Run both servers (use `pm2` to keep them alive):
   ```bash
   npm install -g pm2
   pm2 start "python3 -m uvicorn main:app --host 0.0.0.0 --port 9000" --name backend
   pm2 start "PORT=5173 pnpm --filter @workspace/codeforge run dev" --name frontend
   pm2 save
   ```
6. Use Nginx as a reverse proxy to serve both on port 80/443

### Update GitHub OAuth for Production

When deployed, update your GitHub OAuth App callback URL:
```
https://your-domain.com/api/auth/github/callback
```
And update `APP_URL` and `FRONTEND_URL` in your environment variables.

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Start backend | `cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload` |
| Start frontend | `PORT=5173 pnpm --filter @workspace/codeforge run dev` |
| Install JS deps | `pnpm install` |
| Install Python deps | `cd backend && pip install -r requirements.txt` |
| Check backend health | Open http://localhost:9000/api/health |
| View API docs | Open http://localhost:9000/docs |
| Open app | Open http://localhost:5173 |
| Build VS Code ext | `cd tools/vscode-ext && npm install && npm run build && npm run package` |
| Install VS Code ext | `code --install-extension tools/vscode-ext/codeforge-ai-1.0.0.vsix` |
| Use CLI | `codeforge chat "your question"` |
| Generate session secret | `python3 -c "import secrets; print(secrets.token_hex(32))"` |

---

*CodeForge AI — Built with FastAPI, LangGraph, LangChain, React, Vite, MongoDB, and Qdrant*

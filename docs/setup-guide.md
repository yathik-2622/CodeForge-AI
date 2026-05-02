# CodeForge AI — Complete Setup Guide

> **This guide walks you through every single step to get CodeForge AI running on your laptop.**
> Written for anyone — no coding experience required to follow along.

---

## What You'll Be Running

After completing this guide, you'll have:

```
Your Computer
│
├── Frontend (React)  → http://localhost:5173   (the website you see)
├── Backend (Python)  → http://localhost:9000   (the AI brain)
└── MongoDB           → mongodb://localhost:27017 (the database)
```

---

## Prerequisites: What You Need to Install First

These are programs that CodeForge AI depends on. Install them in this order.

---

### 1. Node.js (v20 or newer)

**What it is:** JavaScript runtime — needed to run the frontend.

**Install:**
- Go to https://nodejs.org
- Download the **LTS** version (the one that says "Recommended for most users")
- Run the installer, click Next through everything

**Verify it worked:**
```bash
node --version
# Should print something like: v20.11.0
```

---

### 2. pnpm (Package Manager)

**What it is:** Like npm but faster — manages the project's code packages.

**Install (after Node.js):**
```bash
npm install -g pnpm
```

**Verify:**
```bash
pnpm --version
# Should print something like: 9.0.0
```

---

### 3. Python 3.11 or newer

**What it is:** Programming language — the AI backend is written in Python.

**Install:**
- Go to https://python.org/downloads
- Download **Python 3.11** or newer
- **Windows:** During installation, check ✅ "Add Python to PATH" (very important!)
- **macOS:** Use the installer from python.org or `brew install python@3.11`

**Verify:**
```bash
python3 --version
# Should print: Python 3.11.x or higher
```

---

### 4. MongoDB Community Edition

**What it is:** The database that stores all your chat sessions and messages.

**Option A: Local Installation (Recommended for beginners)**

- Go to: https://www.mongodb.com/try/download/community
- Select your OS, download, run the installer
- During Windows installation: Install as a Service (so it starts automatically)

**Option B: MongoDB Atlas (Free cloud — no installation)**
- Go to https://www.mongodb.com/cloud/atlas
- Sign up for free
- Create a free cluster (M0 tier)
- Copy the connection string → use it as `MONGODB_URL` in your .env

**Verify local MongoDB is running:**
```bash
# macOS/Linux
mongosh --eval "db.adminCommand('ping')"
# Should print: { ok: 1 }

# Windows — open MongoDB Compass (installed with MongoDB) and connect
```

---

### 5. Git

**What it is:** Version control — needed to download the code.

**Install:**
- Go to https://git-scm.com/downloads
- Download and install for your OS

**Verify:**
```bash
git --version
# Should print: git version 2.x.x
```

---

## Step 1: Get the Code

### Option A: Clone from GitHub
```bash
git clone https://github.com/YOUR_USERNAME/codeforge-ai.git
cd codeforge-ai
```

### Option B: Download from Replit
1. In Replit: Click the three-dot menu → "Download as zip"
2. Unzip the file
3. Open a terminal in the unzipped folder

---

## Step 2: Get Your API Keys

You need these API keys. All have free tiers — no credit card required.

### OpenRouter API Key (REQUIRED for AI)

OpenRouter gives you access to free AI models (Mistral, Llama, Phi, etc.).

1. Go to https://openrouter.ai
2. Click "Sign In" → create a free account
3. Go to https://openrouter.ai/keys
4. Click "Create Key"
5. Copy the key (starts with `sk-or-`)

> **Free models available:** Mistral 7B, Llama 3 8B, Phi-3 Mini, Gemma 3 12B

---

### GitHub OAuth App (for "Sign in with GitHub")

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name:** CodeForge AI (local)
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:9000/api/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** (shown on the page)
6. Click "Generate a new client secret"
7. Copy the **Client Secret** (only shown once!)

---

### Tavily API Key (OPTIONAL — for web search)

Gives the AI the ability to search the internet.
Free tier: 1,000 searches per month.

1. Go to https://tavily.com
2. Sign up for free
3. Your API key is shown on the dashboard

---

## Step 3: Install All Dependencies

### Frontend + TypeScript packages

```bash
# From the root of the codeforge-ai folder
pnpm install
```

Wait for it to finish. This installs all the JavaScript/TypeScript packages.

### Python backend packages

```bash
# Go into the backend folder
cd backend

# Install Python packages
pip install -r requirements.txt

# Go back to root
cd ..
```

If `pip` is not found, try `pip3`:
```bash
pip3 install -r requirements.txt
```

---

## Step 4: Configure the Backend

```bash
# Go into the backend folder
cd backend

# Copy the example .env file
cp .env.example .env
```

Now open the `.env` file in a text editor (Notepad, VS Code, etc.) and fill in your values:

```env
# ── Required ────────────────────────────────────────────────────────────────

# A long random string (32+ characters). Generate one:
# python3 -c "import secrets; print(secrets.token_hex(32))"
SESSION_SECRET=paste-your-generated-secret-here

# Your OpenRouter API key (from Step 2)
OPENROUTER_API_KEY=sk-or-your-key-here

# MongoDB connection (use this if you installed MongoDB locally)
MONGODB_URL=mongodb://localhost:27017

# ── For GitHub login ────────────────────────────────────────────────────────
GITHUB_CLIENT_ID=paste-your-github-client-id
GITHUB_CLIENT_SECRET=paste-your-github-client-secret
APP_URL=http://localhost:9000
FRONTEND_URL=http://localhost:5173

# ── Optional ────────────────────────────────────────────────────────────────
TAVILY_API_KEY=tvly-your-key  # For web search
```

**Save the file.**

---

## Step 5: Run the Applications

You need **two terminal windows open at the same time** — one for the backend, one for the frontend.

### Terminal 1: Python Backend

```bash
# Make sure you're in the backend folder
cd backend

# Start the Python backend server
python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

**You should see:**
```
2024-01-15 10:00:00 | INFO     | codeforge.main | ⚡ CodeForge AI Backend Starting
2024-01-15 10:00:00 | INFO     | codeforge.main | ✅ MongoDB connected
2024-01-15 10:00:00 | INFO     | codeforge.main | ✅ Qdrant ready (in-memory mode)
2024-01-15 10:00:00 | INFO     | codeforge.main | ✅ All services ready!
2024-01-15 10:00:00 | INFO     | codeforge.main |    API docs: http://localhost:9000/docs
```

If you see any errors, check [Troubleshooting](#troubleshooting) below.

### Terminal 2: React Frontend

```bash
# From the project root (not the backend folder)
PORT=5173 pnpm --filter @workspace/codeforge run dev
```

**You should see:**
```
  VITE v5.x  ready in 500 ms
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.x:5173/
```

---

## Step 6: Open the App

Open your browser and go to: **http://localhost:5173**

You should see the CodeForge AI dashboard.

---

## Functionality Test Guide

Test each feature to make sure everything works:

### ✅ Test 1: Health Check (Backend)

Open: http://localhost:9000/api/health

Expected response:
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

---

### ✅ Test 2: Frontend Loads

Open: http://localhost:5173

Expected: You see the CodeForge AI dashboard with a sidebar on the left.

**Test the collapsible sidebar:**
- Click the arrow/panel icon in the top-right corner of the sidebar
- The sidebar should collapse to show only icons
- Click it again to expand it
- Hover over icons when collapsed — you should see tooltips

---

### ✅ Test 3: Create a Chat Session

1. Click "Chat" in the sidebar → `/chat`
2. Click "New Session" or the + button
3. Give it a name like "Test Session"
4. Click Create

Expected: A new session appears in the list.

---

### ✅ Test 4: Send a Message and Get AI Response

1. Click into the session you just created
2. Type: `Write a Python function that reverses a string`
3. Press Enter or click Send

Expected:
- Your message appears immediately
- A typing indicator shows (...)
- AI response streams in word by word
- Response includes Python code with syntax highlighting

---

### ✅ Test 5: Web Search Integration

1. In any chat session, type: `What are the latest features in React 19?`
2. Press Enter

Expected: The AI searches the web (if Tavily is configured) and gives a current answer.

---

### ✅ Test 6: GitHub OAuth Login

1. Click "Sign in with GitHub" in the sidebar footer
2. You're redirected to GitHub's authorization page
3. Click "Authorize CodeForge AI"
4. You're redirected back to the app
5. Your GitHub username and avatar appear in the sidebar

Expected: Sidebar shows your GitHub profile picture and username.

---

### ✅ Test 7: Connect a GitHub Repository

1. Click "Repositories" in the sidebar
2. Click "Connect Repository" or the + button
3. Enter a GitHub repo name (e.g., `facebook/react`)
4. Click Connect
5. Click "Scan" to analyze the repository

Expected: Status changes from "pending" → "scanning" → "ready".

---

### ✅ Test 8: Collaborative Sessions (WebSocket)

1. Open a chat session
2. Copy the URL from the browser address bar
3. Open a new browser window (or incognito tab)
4. Paste the URL and open it
5. In the original window, send a message

Expected:
- Both windows show the AI response streaming simultaneously
- Colored avatars appear in the top-right showing "2 participants"

---

### ✅ Test 9: Instagram Page

1. Click "Instagram" in the sidebar
2. Verify the setup instructions page loads
3. Check the webhook URL is displayed correctly

---

### ✅ Test 10: API Documentation

Open: http://localhost:9000/docs

Expected: Swagger UI showing all API endpoints, where you can test them directly.

---

## Setting Up WhatsApp (Optional)

1. Sign up for Twilio (free): https://twilio.com
2. In Twilio Console → Messaging → Try it out → Set up with WhatsApp
3. Follow the sandbox setup (scan a QR code with your phone)
4. Set the webhook URL to: `http://YOUR_LAPTOP_IP:9000/api/whatsapp/webhook`
   - Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Example: `http://192.168.1.100:9000/api/whatsapp/webhook`
5. Add to `backend/.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
6. Restart the backend (`Ctrl+C` then run again)
7. Send "hi" to the Twilio WhatsApp number from your phone

---

## Setting Up Instagram (Optional)

See the Instagram page in the app (`/instagram`) for the full setup guide.
Requires an Instagram Business account.

---

## Stopping the App

To stop the servers:
- In each terminal: Press **Ctrl+C**

To start again:
- Terminal 1: `cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload`
- Terminal 2: `PORT=5173 pnpm --filter @workspace/codeforge run dev`

---

## Troubleshooting

### Problem: "python3: command not found"
**Solution:** Python is not in your PATH.
- Windows: Reinstall Python, check ✅ "Add Python to PATH"
- macOS: Run `brew install python3` or use the python.org installer

### Problem: "pip: command not found"
**Solution:** Try `pip3` instead, or run `python3 -m pip install -r requirements.txt`

### Problem: "MongoDB connection refused"
**Solution:** MongoDB is not running. Start it:
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows: Open "Services" → Find "MongoDB" → Start
```

### Problem: "OPENROUTER_API_KEY not set"
**Solution:** Make sure your `.env` file is in the `backend/` folder and has the key:
```
OPENROUTER_API_KEY=sk-or-your-actual-key
```

### Problem: Frontend shows blank page
**Solution:**
1. Make sure the backend is running first
2. Check both terminals for error messages
3. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Open browser DevTools (F12) → Console tab → look for errors

### Problem: "Port 9000 already in use"
**Solution:**
```bash
# Find and kill the process using port 9000
# macOS/Linux:
lsof -ti:9000 | xargs kill

# Windows:
netstat -ano | findstr :9000
taskkill /PID <the-number-you-see> /F
```

### Problem: GitHub login redirects to error page
**Solution:** Check that your GitHub OAuth App callback URL is exactly:
```
http://localhost:9000/api/auth/github/callback
```
(with the correct port and path)

### Problem: AI responses are empty or "API key not set"
**Solution:**
1. Check your `OPENROUTER_API_KEY` in `backend/.env`
2. Verify the key is valid at: https://openrouter.ai/keys
3. Restart the backend server

---

## Getting Help

1. **Check the backend logs** (Terminal 1) — most errors show there
2. **Check the browser console** (F12 → Console tab)
3. **Visit the API docs** at http://localhost:9000/docs to test endpoints directly
4. **Health check** at http://localhost:9000/api/health shows service status

---

*CodeForge AI — Built with FastAPI, LangGraph, LangChain, React, MongoDB, and Qdrant*

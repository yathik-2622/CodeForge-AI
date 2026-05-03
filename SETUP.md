# CodeForge AI — Local Setup & Test Guide

Complete step-by-step guide to run, test, and use CodeForge AI on Windows.

---

## Prerequisites

Install these first (once):

| Tool | Download | Version needed |
|------|----------|---------------|
| Node.js | https://nodejs.org | 18 or 20 LTS |
| Python | https://python.org/downloads | 3.11+ |
| Git | https://git-scm.com | any |

Verify in a new terminal:
```
node --version    # v18 or v20
python --version  # 3.11 or 3.12
git --version
```

---

## Step 1 — Clone the Repo

```cmd
git clone https://github.com/yathik-2622/CodeForge-AI.git
cd CodeForge-AI
```

---

## Step 2 — Get Your Free API Keys

You need at least ONE of these (both is better):

### OpenRouter (free, no credit card)
1. Go to https://openrouter.ai/keys
2. Click **Create Key**
3. Copy the key — it starts with `sk-or-v1-...`

### Groq (free, ultra-fast)
1. Go to https://console.groq.com/keys
2. Click **Create API Key**
3. Copy the key — it starts with `gsk_...`

---

## Step 3 — MongoDB Atlas Setup (Cloud Only)

1. Go to https://cloud.mongodb.com
2. Create a free **M0** cluster (if you don't have one)
3. Go to **Database Access** → Add user → set username + password
4. Go to **Network Access** → Add IP Address → **Allow access from anywhere** (0.0.0.0/0)
5. Click **Connect** on your cluster → **Drivers** → copy the connection string
6. It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net`

---

## Step 4 — Configure Environment Files

Open **3 separate Notepad/VS Code windows** and create these files:

### backend/.env
Create file at `CodeForge-AI\backend\.env`:
```
MONGODB_URL=mongodb+srv://YOUR_USER:YOUR_PASS@YOUR_CLUSTER.mongodb.net
MONGODB_DB=codeforge
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=any-random-32-char-string-here-abc123
TAVILY_API_KEY=
PORT=9000
FRONTEND_URL=http://localhost:5173
```

### node_api/.env
Create file at `CodeForge-AI\node_api\.env`:
```
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
PORT=3000
APP_URL=http://localhost:3000
```

### frontend/.env
Create file at `CodeForge-AI\frontend\.env`:
```
VITE_API_URL=http://localhost:3000
VITE_PYTHON_API_URL=http://localhost:9000
```

---

## Step 5 — Install Dependencies

Open **3 PowerShell/CMD windows**. Run one group in each:

### Terminal 1 — Frontend
```cmd
cd CodeForge-AI\frontend
npm install
```

### Terminal 2 — Node API
```cmd
cd CodeForge-AI\node_api
npm install
```

### Terminal 3 — Python Backend
```cmd
cd CodeForge-AI\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

## Step 6 — Start All Services

Keep 3 terminals open — one for each service:

### Terminal 1 — Frontend (React + Vite)
```cmd
cd CodeForge-AI\frontend
npm run dev
```
Expected output:
```
  VITE v5.x.x  ready in 500ms
  Local: http://localhost:5173/
```

### Terminal 2 — Node API (Express + AI)
```cmd
cd CodeForge-AI\node_api
npm run dev
```
Expected output:
```
{"level":"info","port":3000,"msg":"Server listening"}
```

### Terminal 3 — Python Backend (FastAPI + MongoDB)
```cmd
cd CodeForge-AI\backend
venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```
Expected output:
```
  ⚡ CodeForge AI — Backend Starting
  ✅ MongoDB Atlas connected — db: 'codeforge'
  ✅ CodeForge AI is running!
```

---

## Step 7 — Open the App

Open your browser and go to:
```
http://localhost:5173
```

You should see the CodeForge AI dashboard.

---

## Step 8 — Install the CLI (Optional but Recommended)

Open a **4th terminal**:

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

---

## Testing Everything

### Test 1 — Frontend loads
Open http://localhost:5173 — you should see the dashboard.

### Test 2 — Node API health
Open http://localhost:3000/api/healthz in your browser.
Expected: `{"status":"ok"}`

### Test 3 — All 23 AI models load
Open http://localhost:3000/api/models
Expected: JSON array of 23 models.

### Test 4 — Python backend health
Open http://localhost:9000/api/health
Expected: `{"status":"ok","services":{"mongodb":"connected", ...}}`

### Test 5 — Python models endpoint
Open http://localhost:9000/api/models
Expected: JSON array of 23 models (same list, from Python).

### Test 6 — FastAPI docs
Open http://localhost:9000/docs
You can test all API endpoints interactively from the browser.

### Test 7 — CLI chat
```cmd
cf
```
Type a question like: "write a python hello world"
You should get a streamed response.

### Test 8 — CLI models
```cmd
cf models
```
Should list all 23 models with active model highlighted.

### Test 9 — CLI run (the new feature)
```cmd
cf run "python --version"
```
Should succeed. To test the AI error-healing:
```cmd
cf run "node nonexistent-script.js"
```
It will fail, then ask if you want AI to diagnose it.

### Test 10 — CLI analyze
Navigate to any code folder on your machine:
```cmd
cd path\to\any\project
cf analyze .
```
AI will analyze the whole codebase.

---

## Troubleshooting

### MongoDB still fails to connect

**Check 1:** In Atlas → Network Access, is `0.0.0.0/0` added?

**Check 2:** Is your password URL-encoded? If it has special chars like `@#$`, encode them:
- `@` → `%40`
- `#` → `%23`

**Check 3:** Is the cluster paused? (Free tier pauses after 60 days of inactivity)
- Atlas → Clusters → click **Resume** if it says Paused.

**Check 4:** Copy the exact connection string from Atlas:
- Click **Connect** → **Drivers** → select Python → copy the URI

### Frontend shows blank page

```cmd
cd CodeForge-AI\frontend
npm install          # re-install (may be missing tw-animate-css)
npm run dev
```

### Node API port already in use

Another process is on port 3000. Find and kill it:
```cmd
netstat -ano | findstr :3000
taskkill /PID <number> /F
```

### Python import errors

```cmd
cd CodeForge-AI\backend
venv\Scripts\activate
pip install --upgrade -r requirements.txt
```

### CLI "cf not found"

Run as Administrator:
```cmd
cd CodeForge-AI\cli
npm run build
npm link
```

Or use PowerShell as Administrator and try:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Main UI |
| Node API | http://localhost:3000 | AI streaming, models |
| Python API | http://localhost:9000 | MongoDB, auth, search |
| Python Docs | http://localhost:9000/docs | Interactive API explorer |
| Models (Node) | http://localhost:3000/api/models | List all 23 models |
| Models (Python) | http://localhost:9000/api/models | Same list from FastAPI |

## CLI Quick Reference

```cmd
cf                        Open interactive AI chat
cf ask "question"         Quick one-shot answer
cf run "command"          Run command, AI fixes errors
cf fix src/file.ts        AI-powered code fix
cf explain src/file.ts    Explain any code file
cf analyze .              Analyze whole project
cf commit                 AI commit message
cf models                 List all 23 AI models
cf status                 Check all connections
cf config                 View/set API keys + model
```

# CodeForge AI — Python Backend

> **The brains behind CodeForge AI** — a FastAPI server powered by LangGraph multi-agent workflows, LangChain LLM orchestration, MongoDB, and Qdrant vector search.

---

## Table of Contents

1. [What This Does](#what-this-does)
2. [Technology Stack](#technology-stack)
3. [Folder Structure](#folder-structure)
4. [Quick Start (5 minutes)](#quick-start)
5. [Environment Variables](#environment-variables)
6. [API Endpoints](#api-endpoints)
7. [How the AI Works](#how-the-ai-works)
8. [Database: MongoDB](#database-mongodb)
9. [Vector Search: Qdrant](#vector-search-qdrant)
10. [WhatsApp Integration](#whatsapp-integration)
11. [Instagram Integration](#instagram-integration)
12. [Running in Production](#running-in-production)
13. [Troubleshooting](#troubleshooting)

---

## What This Does

This backend is the server that:
- **Accepts chat messages** from the frontend (React app) and the mobile messaging apps
- **Runs AI agents** using LangGraph multi-agent workflows (Supervisor → Researcher → Coder pipeline)
- **Streams responses** token by token using Server-Sent Events (SSE), giving the "typing" effect
- **Manages data** in MongoDB (sessions, messages, users, repositories)
- **Stores code embeddings** in Qdrant for semantic code search
- **Handles webhooks** from Twilio for WhatsApp and Instagram DMs

---

## Technology Stack

| Technology | Purpose | Why We Use It |
|-----------|---------|---------------|
| **FastAPI** | Web framework | Fastest Python web framework, built-in async support |
| **LangGraph** | Multi-agent orchestration | Defines AI agents as a graph (flowchart) of steps |
| **LangChain** | LLM integration | Standardizes how we call different AI models |
| **OpenRouter** | AI model provider | Free access to Mistral, Llama, Phi, Gemma models |
| **Motor** | MongoDB async driver | Non-blocking database calls (app stays fast) |
| **Qdrant** | Vector database | Stores code as numbers for semantic similarity search |
| **Uvicorn** | ASGI server | Runs the FastAPI app, handles concurrent requests |
| **Twilio** | WhatsApp + Instagram | Receives and sends messages on these platforms |
| **python-jose** | JWT tokens | Securely identifies logged-in users |

---

## Folder Structure

```
backend/
├── main.py                    # App entry point — start here!
├── requirements.txt           # All Python packages needed
├── .env.example               # Template for your .env file
├── README.md                  # This file
│
└── app/
    ├── config.py              # All settings loaded from .env file
    │
    ├── db/
    │   ├── mongo.py           # MongoDB connection and collections
    │   └── qdrant.py          # Qdrant vector store connection
    │
    ├── models/
    │   ├── session.py         # Chat session + message data shapes
    │   ├── user.py            # User account data shape
    │   └── repository.py      # GitHub repository data shape
    │
    ├── agents/
    │   ├── graph.py           # LangGraph multi-agent workflow ← MAIN AI LOGIC
    │   └── tools.py           # Tools agents can use (web search, GitHub search)
    │
    ├── routes/
    │   ├── health.py          # GET /api/health — server status check
    │   ├── auth.py            # GitHub OAuth login (/api/auth/*)
    │   ├── sessions.py        # Chat sessions + streaming (/api/sessions/*)
    │   ├── repositories.py    # GitHub repos (/api/repositories/*)
    │   ├── search.py          # Web search (/api/search/*)
    │   ├── whatsapp.py        # WhatsApp webhook (/api/whatsapp/*)
    │   ├── instagram.py       # Instagram webhook (/api/instagram/*)
    │   └── dashboard.py       # Stats (/api/dashboard/*)
    │
    ├── middleware/
    │   └── auth.py            # JWT auth — who is making this request?
    │
    └── lib/
        ├── auth.py            # Create and verify JWT tokens
        ├── search.py          # Tavily web search
        ├── github_client.py   # GitHub API calls
        └── websocket.py       # Real-time WebSocket connections
```

---

## Quick Start

### Prerequisites

- Python 3.11 or newer ([download](https://python.org/downloads))
- MongoDB ([download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier)

### Step 1: Install dependencies

```bash
# From the project root, go into the backend folder
cd backend

# Install all Python packages
pip install -r requirements.txt
```

### Step 2: Configure environment variables

```bash
# Copy the example .env file
cp .env.example .env

# Open .env in any text editor and fill in your values
# The MINIMUM required values are:
#   SESSION_SECRET   (any random string, 32+ chars)
#   OPENROUTER_API_KEY  (get free key at openrouter.ai)
#   MONGODB_URL      (mongodb://localhost:27017 if running locally)
```

### Step 3: Start MongoDB

If you installed MongoDB locally:
```bash
# macOS
brew services start mongodb-community

# Windows — run in a new terminal
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"

# Linux
sudo systemctl start mongod
```

### Step 4: Run the backend

```bash
# From the backend/ folder:
python -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

You should see:
```
✅ MongoDB connected — database: 'codeforge'
✅ Qdrant ready (in-memory mode)
✅ All services ready — CodeForge AI is running!
   API docs: http://localhost:9000/docs
   Health:   http://localhost:9000/api/health
```

### Step 5: Verify it works

Open your browser at: http://localhost:9000/api/health

You should see a JSON response showing all services are connected.

---

## Environment Variables

All variables are loaded from the `.env` file in the `backend/` folder.

| Variable | Required | Description | Where to get it |
|---------|----------|-------------|-----------------|
| `SESSION_SECRET` | ✅ Yes | Random secret for JWT tokens | Run: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `OPENROUTER_API_KEY` | ✅ Yes | Free AI model access | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `MONGODB_URL` | ✅ Yes | MongoDB connection string | `mongodb://localhost:27017` for local |
| `GITHUB_CLIENT_ID` | For login | GitHub OAuth app ID | [github.com/settings/developers](https://github.com/settings/developers) |
| `GITHUB_CLIENT_SECRET` | For login | GitHub OAuth app secret | Same as above |
| `TAVILY_API_KEY` | Optional | Web search (1000 free/month) | [tavily.com](https://tavily.com) |
| `QDRANT_URL` | Optional | Qdrant server URL | Leave empty for in-memory mode |
| `TWILIO_ACCOUNT_SID` | For WhatsApp/IG | Twilio account ID | [console.twilio.com](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | For WhatsApp/IG | Twilio auth token | Same as above |
| `TWILIO_WHATSAPP_FROM` | For WhatsApp | Your WhatsApp sender | `whatsapp:+14155238886` (sandbox) |
| `TWILIO_INSTAGRAM_FROM` | For Instagram | Your Instagram page ID | `instagram:your-page-id` |

---

## API Endpoints

Once running, all endpoints are listed at: http://localhost:9000/docs

### Key Endpoints

#### Health Check
```
GET /api/health
```
Returns status of all services (MongoDB, Qdrant, AI API keys).

#### GitHub Login
```
GET /api/auth/github                    → Redirect to GitHub OAuth
GET /api/auth/github/callback?code=...  → GitHub calls this after login
GET /api/auth/me                        → Get current logged-in user
POST /api/auth/logout                   → Log out
```

#### Chat Sessions
```
POST   /api/sessions              → Create new session
GET    /api/sessions              → List all sessions
GET    /api/sessions/{id}         → Get a session
POST   /api/sessions/{id}/messages → Send a message
POST   /api/sessions/{id}/stream  → Stream AI response (SSE)
GET    /api/sessions/{id}/messages → Get all messages
WS     /api/sessions/{id}/ws      → Real-time collaboration
```

#### AI Streaming Example
```javascript
// Frontend: stream AI response token by token
const response = await fetch('/api/sessions/abc123/stream', { method: 'POST' });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  // Parse SSE: "event: token\ndata: {"token": "Hello"}\n\n"
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.token) console.log(data.token); // Each token as it arrives
    }
  }
}
```

#### Web Search
```
GET /api/search/web?q=react+hooks     → Search the web
GET /api/search/models                → List available AI models
```

#### Repositories
```
GET    /api/repositories         → List connected repos
POST   /api/repositories         → Connect a repo
GET    /api/github/repos         → Browse user's GitHub repos (login required)
GET    /api/github/search?q=...  → Search public GitHub repos
POST   /api/repositories/{id}/scan → Scan repo structure
```

---

## How the AI Works

The AI uses a **multi-agent pipeline** built with LangGraph.
Think of it like a team where each person has a specific job:

```
User Message
     │
     ▼
┌─────────────┐
│  SUPERVISOR │  "What kind of task is this?"
│             │  → needs web search? → RESEARCHER
│             │  → needs coding?    → CODER
│             │  → simple answer?   → DIRECT
└──────┬──────┘
       │
  ┌────┴────────────────────┐
  │                         │
  ▼                         ▼
┌──────────┐         ┌──────────┐
│RESEARCHER│         │  CODER   │
│ Searches │────────►│ Generates│
│ the web  │         │  code    │
└──────────┘         └────┬─────┘
                          │
                          ▼
                       Response
                    streamed back
                   token by token
```

### Agents

| Agent | Job | When used |
|-------|-----|-----------|
| **Supervisor** | Analyzes the request, decides routing | Every request |
| **Researcher** | Searches Tavily for current info | "latest", "docs", "search" keywords |
| **Coder** | Generates code responses via LLM | Coding requests |
| **Direct** | Answers simple questions | Factual/simple questions |

### Streaming

Responses are streamed using **Server-Sent Events (SSE)**:
1. Frontend sends POST to `/api/sessions/{id}/stream`
2. Backend keeps the connection open
3. As the AI generates each token, it's sent immediately
4. Frontend displays each token → "typing" effect
5. WebSocket also broadcasts tokens to all collaborators in the session

---

## Database: MongoDB

We use MongoDB (not SQL) because:
- Chat messages are naturally JSON documents (no rigid schema needed)
- Easy to store varied metadata per message (model used, tools called, etc.)
- Great performance for time-series data (messages, logs)

### Collections (like SQL tables)

| Collection | Purpose |
|-----------|---------|
| `users` | GitHub user accounts |
| `sessions` | Chat session records |
| `messages` | Individual chat messages |
| `repositories` | Connected GitHub repos |

### Viewing Your Data

Use **MongoDB Compass** (free GUI): https://www.mongodb.com/products/compass

Or use the command line:
```bash
mongosh codeforge
db.sessions.find().limit(5)
db.messages.countDocuments()
```

---

## Vector Search: Qdrant

Qdrant stores code as **vectors** (lists of numbers) so you can search by meaning instead of keywords.

Example:
- You search: "function that validates emails"
- Even if the code says `checkEmailFormat()`, Qdrant finds it because the meaning is similar

### Development Mode (default)

No setup needed — data is stored in memory (lost on restart). Perfect for testing.

### Production Mode

Run Qdrant with Docker:
```bash
docker run -p 6333:6333 qdrant/qdrant
```

Then set in `.env`:
```
QDRANT_URL=http://localhost:6333
```

---

## WhatsApp Integration

See the WhatsApp page in the CodeForge AI frontend for setup instructions.

Quick summary:
1. Create Twilio account
2. Enable WhatsApp sandbox
3. Set webhook: `https://your-domain.com/api/whatsapp/webhook`
4. Add env vars

Users can then message your number and get AI coding help via WhatsApp.

---

## Instagram Integration

Same as WhatsApp but for Instagram DMs. Requires:
- Instagram Business/Creator account
- Facebook Page connected to it
- Twilio Instagram channel setup

Webhook: `https://your-domain.com/api/instagram/webhook`

---

## Running in Production

For a production deployment:

```bash
# Install production ASGI server
pip install gunicorn

# Run with multiple workers
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:9000
```

Or with Docker:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
```

---

## Troubleshooting

### "MongoDB connection refused"
MongoDB isn't running. Start it:
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Check if it's running
mongosh --eval "db.adminCommand('ping')"
```

### "OPENROUTER_API_KEY not set"
Get a free key at https://openrouter.ai/keys and add it to `.env`.

### "Module not found" errors
Re-install dependencies:
```bash
pip install -r requirements.txt
```

### Port 9000 already in use
```bash
# Find what's using port 9000
lsof -i :9000         # macOS/Linux
netstat -ano | findstr :9000  # Windows

# Kill it or change PORT in .env
PORT=9001
```

### CORS errors in browser
Add your frontend URL to the `FRONTEND_URL` env var:
```
FRONTEND_URL=http://localhost:5173
```

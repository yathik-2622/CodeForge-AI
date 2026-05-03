# CodeForge AI

> Autonomous AI coding platform — browser app, CLI, VS Code extension, and WhatsApp bot. 23 free AI models, zero cost.

[![GitHub](https://img.shields.io/badge/GitHub-yathik--2622%2FCodeForge--AI-blue?logo=github)](https://github.com/yathik-2622/CodeForge-AI)

---

## Components

| Component | Port | Description |
|---|---|---|
| **Frontend** (React+Vite) | 5173 | Landing page → GitHub login → Dashboard |
| **Node API** (Express/TS) | 3000 | AI streaming, GitHub OAuth, WebSocket, sessions |
| **FastAPI** (Python) | 9000 | LangGraph agents, MongoDB, Tavily, WhatsApp |
| **CLI** (`cf`) | — | 8 commands: ask, fix, explain, commit, generate, analyze, models, status |
| **VS Code Extension** | — | Chat, fix, explain, generate tests |
| **WhatsApp Bot** | — | Code answers via WhatsApp (Twilio) |

---

## Setup

### node_api/.env (required)
```env
MONGODB_URL=mongodb+srv://USER:PASS@cluster.mongodb.net
MONGODB_DB=codeforge
OPENROUTER_API_KEY=sk-or-v1-...
GROQ_API_KEY=gsk_...
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
SESSION_SECRET=any-32-char-string
FRONTEND_URL=http://localhost:5173
PORT=3000
```
> If `MONGODB_URL` is missing, the API starts in offline mode (empty data, no crash).

### GitHub OAuth App
- Authorization callback URL: `http://localhost:3000/api/auth/github/callback`

### Start servers
```bash
# Node API
cd node_api && npm install && npm run dev

# FastAPI
cd backend && pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 9000 --reload

# Frontend
cd frontend && npm install && npm run dev
```

---

## CLI (`cf`)

```bash
cd cli && npm run build && npm link

cf config --openrouter-key sk-or-v1-...   # save OpenRouter key
cf config --groq-key gsk_...              # save Groq key
cf config --model google/gemma-2-9b-it:free

cf ask "explain async/await"
cf fix src/app.ts
cf explain src/auth.py
cf analyze src/routes.ts
cf commit
cf generate "FastAPI endpoint for user auth with JWT"
cf models                                 # list all 23 models
cf status                                 # check API health
```

---

## Free Models

### OpenRouter (free tier)
| Model ID | Notes |
|---|---|
| `google/gemma-2-9b-it:free` | **Default** |
| `google/gemma-3-12b-it:free` | 128k context |
| `meta-llama/llama-3.1-8b-instruct:free` | 128k context |
| `meta-llama/llama-3.2-3b-instruct:free` | Fastest |
| `deepseek/deepseek-r1:free` | Reasoning |
| `deepseek/deepseek-r1-distill-llama-70b:free` | Reasoning 70B |
| `qwen/qwen-2.5-7b-instruct:free` | Alibaba |
| `mistralai/mistral-nemo:free` | 12B |
| `microsoft/phi-3-mini-128k-instruct:free` | 128k context |
| `openchat/openchat-7b:free` | Chat |
| `mistralai/mistral-small-3.2-24b-instruct:free` | 24B |

### Groq (blazing fast)
| Model ID | Notes |
|---|---|
| `groq/llama-3.3-70b-versatile` | Best quality |
| `groq/llama-3.1-8b-instant` | Fastest |
| `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Newest |
| `groq/compound-beta` | Groq agent |
| `groq/compound-beta-mini` | Groq agent mini |
| `groq/qwen/qwen3-32b` | Alibaba via Groq |
| `groq/openai/gpt-oss-120b` | OpenAI via Groq |
| `groq/openai/gpt-oss-20b` | OpenAI via Groq |

---

## Auth Flow

1. User visits `/` → sees **landing page** (unauthenticated)
2. Clicks **Sign in with GitHub** → `/api/auth/github`
3. GitHub OAuth → callback sets `auth_token` cookie
4. Redirects to `/` → user sees **dashboard** (authenticated)

---

## VS Code Extension

```bash
cd vscode-extension
npm install
npx vsce package --no-dependencies   # answer y to LICENSE warning
code --install-extension codeforge-ai-0.1.0.vsix
```

Commands: Open Chat, Ask About Selection, Fix This Code, Explain Selection, Generate Tests

---

## WhatsApp Bot

```env
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```
Webhook: `POST /api/whatsapp/webhook`

---

## License

MIT

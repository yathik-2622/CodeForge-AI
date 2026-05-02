# ⚡ CodeForge AI

> Autonomous AI coding agent — web app, VS Code extension, CLI, and WhatsApp integration.

Use it from **anywhere**: browser, VS Code sidebar, terminal, or WhatsApp.  
Powered by **free open-source LLMs** (Mistral, Llama 3, Phi-3, Gemma 3) via OpenRouter.

---

## Interfaces

| Interface | How |
|-----------|-----|
| 🌐 **Web App** | Full dashboard at your deployed URL |
| 🧩 **VS Code Extension** | Sidebar chat, explain/fix/test code, keyboard shortcuts |
| 💻 **CLI** | `codeforge chat "..."` on Windows, Linux, macOS |
| 📱 **WhatsApp** | Send a message to your Twilio number → AI responds |

---

## Features

| Feature | Description |
|---|---|
| **GitHub OAuth** | Sign in with GitHub — access public & private repos |
| **Real Repo Scanning** | Analyzes file tree, languages, frameworks, dependencies |
| **Open-Source AI** | Mistral 7B, Llama 3 8B, Phi-3 via OpenRouter (free tier) |
| **SSE Streaming** | Token-by-token streaming like ChatGPT |
| **Web Search** | Tavily AI search integrated into agent context |
| **Security Monitoring** | Scans for secrets, injections, vulnerabilities |
| **Sandboxed Terminal** | Blocks destructive commands (rm -rf, DROP TABLE, etc.) |
| **Deployment Tracking** | Track deploys across AWS, Azure, GCP, Docker, k8s |

---

## Tech Stack

**Frontend:** React 19, Vite, Tailwind CSS v4, TanStack Query, Wouter, shadcn/ui, Recharts  
**Backend:** Express 5, Drizzle ORM, PostgreSQL, Pino  
**AI:** OpenRouter API (OpenAI-compatible, free open-source models)  
**Search:** Tavily AI / SerpAPI  
**Auth:** GitHub OAuth 2.0 + JWT cookies  
**Monorepo:** pnpm workspaces  

---

## Local Setup

### 1. Prerequisites

- **Node.js** 20+ (`node --version`)
- **pnpm** 10+ (`npm install -g pnpm`)
- **PostgreSQL** 15+ running locally

### 2. Clone and install

```bash
git clone <your-repo-url>
cd codeforge-ai
pnpm install
```

### 3. Create a PostgreSQL database

```bash
createdb codeforge
```

Or with Docker:

```bash
docker run -d \
  --name codeforge-pg \
  -e POSTGRES_DB=codeforge \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15
```

### 4. Environment Variables

Create `artifacts/api-server/.env`:

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codeforge
SESSION_SECRET=your-random-secret-at-least-32-chars

# App URL (must match GitHub OAuth callback)
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# GitHub OAuth — create at https://github.com/settings/developers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI — free account at https://openrouter.ai
OPENROUTER_API_KEY=sk-or-v1-...

# Web Search — free tier at https://tavily.com (1000 searches/month free)
TAVILY_API_KEY=tvly-...

# Optional: SerpAPI fallback if Tavily not available
# SERPAPI_KEY=your_serpapi_key
```

### 5. Set up GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** CodeForge AI (Local)
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/github/callback`
4. Copy **Client ID** and generate a **Client Secret**
5. Add both to your `.env`

### 6. Get OpenRouter API Key (Free)

1. Go to https://openrouter.ai
2. Sign up (free)
3. Go to **Keys** → Create key
4. Free models available: Mistral 7B, Llama 3 8B, Phi-3 Mini, Gemma 3 12B
5. Add key to `OPENROUTER_API_KEY` in `.env`

### 7. Get Tavily API Key (Free Tier)

1. Go to https://tavily.com
2. Sign up → get API key
3. Free tier: **1,000 searches/month**
4. Add to `TAVILY_API_KEY`

### 8. Push database schema

```bash
pnpm --filter @workspace/db run push-force
```

### 9. Seed with sample data (optional)

```bash
pnpm --filter @workspace/api-server run seed
```

### 10. Start development servers

In two terminals:

```bash
# Terminal 1 — API server (port 3000)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 5173)
pnpm --filter @workspace/codeforge run dev
```

Then open http://localhost:5173

---

## Production Deployment

### With Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: codeforge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: artifacts/api-server/Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/codeforge
      SESSION_SECRET: ${SESSION_SECRET}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      TAVILY_API_KEY: ${TAVILY_API_KEY}
      APP_URL: ${APP_URL}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: artifacts/codeforge/Dockerfile
    ports:
      - "5173:80"

volumes:
  pgdata:
```

Run:
```bash
cp .env.example .env  # fill in values
docker-compose up -d
```

### Environment for Production

Set `APP_URL` to your domain (e.g. `https://codeforge.yourdomain.com`).  
Update your GitHub OAuth App's callback URL to match.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/github` | GET | Redirect to GitHub OAuth |
| `/api/auth/github/callback` | GET | OAuth callback |
| `/api/auth/me` | GET | Current user |
| `/api/auth/logout` | POST | Sign out |
| `/api/github/repos` | GET | List/search GitHub repos |
| `/api/github/repos/:owner/:repo/tree` | GET | Get repo file tree |
| `/api/github/repos/:owner/:repo/import` | POST | Import & scan repo |
| `/api/search/web` | GET | Web search via Tavily |
| `/api/models` | GET | Available AI models |
| `/api/repositories` | GET/POST | Manage connected repos |
| `/api/sessions` | GET/POST | Agent chat sessions |
| `/api/sessions/:id/messages` | GET/POST | Chat messages |
| `/api/sessions/:id/stream` | POST | SSE streaming response |
| `/api/executions` | GET/POST | Terminal executions |
| `/api/security/findings` | GET | Security findings |
| `/api/deployments` | GET | Deployment history |
| `/api/dashboard/stats` | GET | Dashboard metrics |

---

## Available AI Models (Free via OpenRouter)

| Model | ID | Best For |
|---|---|---|
| Mistral 7B | `mistralai/mistral-7b-instruct:free` | General coding |
| Llama 3 8B | `meta-llama/llama-3-8b-instruct:free` | Code generation |
| Phi-3 Mini | `microsoft/phi-3-mini-128k-instruct:free` | Long context |
| Gemma 3 12B | `google/gemma-3-12b-it:free` | Analysis |

---

## Architecture

```
codeforge-ai/
├── artifacts/
│   ├── api-server/          # Express API (port 3000)
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── ai.ts       # OpenRouter streaming client
│   │   │   │   ├── github.ts   # GitHub API + OAuth
│   │   │   │   └── search.ts   # Tavily/SerpAPI web search
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts     # JWT cookie auth
│   │   │   └── routes/
│   │   │       ├── auth.ts     # GitHub OAuth routes
│   │   │       ├── sessions.ts # AI chat + SSE streaming
│   │   │       ├── github.ts   # Repo search/import
│   │   │       └── ...
│   └── codeforge/           # React frontend (port 5173)
│       └── src/
│           ├── lib/
│           │   └── auth.tsx    # Auth context + hooks
│           └── pages/
│               ├── Chat.tsx    # SSE streaming chat UI
│               ├── Login.tsx   # GitHub OAuth login
│               └── ...
├── lib/
│   ├── db/                  # Drizzle ORM + PostgreSQL schema
│   ├── api-spec/            # OpenAPI spec (contract-first)
│   ├── api-zod/             # Zod validators (generated)
│   └── api-client-react/    # React Query hooks (generated)
└── README.md
```

---

## Security Notes

- GitHub tokens stored in PostgreSQL — consider encrypting with `pgcrypto` in production
- JWT secret must be at least 32 random characters in production
- Set `NODE_ENV=production` — enables secure cookies and disables debug logs
- Destructive terminal commands are blocked: `rm -rf`, `DROP TABLE`, `mkfs`, `format c:`, etc.

---

## License

MIT — self-host freely, use commercially, modify as needed.

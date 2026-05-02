# Workspace

## Overview

pnpm workspace monorepo using TypeScript for the frontend + Express API,
plus a standalone Python FastAPI backend at `backend/`.

## Architecture

```
codeforge-ai/
├── artifacts/
│   ├── codeforge/          ← React frontend (Vite + TypeScript)
│   └── api-server/         ← TypeScript Express API (PostgreSQL + Drizzle)
├── backend/                ← Python FastAPI backend (MongoDB + Qdrant + LangGraph)
├── frontend/               ← README + reference guide for the React app
├── docs/
│   └── setup-guide.md      ← Full step-by-step local setup guide
├── tools/
│   ├── vscode-ext/         ← VS Code extension
│   └── cli/                ← @codeforge/cli npm package
└── lib/                    ← Shared TypeScript libraries
```

## Stack

### Frontend (artifacts/codeforge)
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: Wouter
- **State**: TanStack Query

### TypeScript API (artifacts/api-server)
- **Framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod

### Python Backend (backend/)
- **Framework**: FastAPI + Uvicorn (ASGI)
- **AI Orchestration**: LangGraph (multi-agent graph) + LangChain
- **LLM Provider**: OpenRouter (free models: Mistral, Llama, Phi, Gemma)
- **Database**: MongoDB (async via Motor driver)
- **Vector Store**: Qdrant (semantic code search)
- **Auth**: GitHub OAuth 2.0 + JWT cookies
- **Streaming**: SSE (Server-Sent Events) for AI token streaming
- **Real-time**: WebSockets for collaborative sessions
- **Messaging**: Twilio (WhatsApp + Instagram DMs)

## Workflows

| Name | Port | Command |
|------|------|---------|
| `artifacts/codeforge: web` | 5173 | `pnpm --filter @workspace/codeforge run dev` |
| `artifacts/api-server: API Server` | 8080 | `pnpm --filter @workspace/api-server run dev` |
| `backend: Python API Server` | 9000 | `cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 9000 --reload` |

## Key Commands

- `pnpm run typecheck` — full TypeScript typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `cd backend && pip install -r requirements.txt` — install Python dependencies

## Features

- **Collapsible sidebar** — click toggle to shrink to icon-only mode
- **AI chat with SSE streaming** — tokens stream in real-time
- **LangGraph agents** — Supervisor → Researcher → Coder pipeline
- **GitHub OAuth login** — sign in with GitHub
- **GitHub repo scanning** — connect and analyze repos
- **Tavily web search** — AI searches the web when needed
- **WhatsApp integration** — chat via WhatsApp DMs (Twilio)
- **Instagram integration** — chat via Instagram DMs (Twilio)
- **Collaborative sessions** — multiple users, real-time WebSocket sync
- **VS Code extension** — sidebar chat, explain/fix/test commands
- **CLI tool** — @codeforge/cli for terminal usage

## Environment Variables

### Python Backend (backend/.env)
- `SESSION_SECRET` — JWT signing secret
- `OPENROUTER_API_KEY` — free AI model access (openrouter.ai)
- `MONGODB_URL` — MongoDB connection string
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — OAuth app credentials
- `TAVILY_API_KEY` — web search (optional)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — WhatsApp + Instagram
- `TWILIO_WHATSAPP_FROM` — WhatsApp sender number
- `TWILIO_INSTAGRAM_FROM` — Instagram page ID

### TypeScript API (root .env or Replit secrets)
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — same secret as Python backend

## Reference Docs

- `backend/README.md` — full Python backend documentation
- `frontend/README.md` — React frontend guide
- `docs/setup-guide.md` — complete local setup guide (step by step, non-technical)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

# CodeForge AI ⚡

> **Autonomous coding platform** · 23 free AI models · CLI · VS Code extension · WhatsApp bot

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-free%20models-violet)](https://openrouter.ai)
[![Groq](https://img.shields.io/badge/Groq-blazing%20fast-yellow)](https://console.groq.com)

---

## What is CodeForge AI?

CodeForge AI is a full-stack developer platform that combines:

- **23 free AI models** from OpenRouter and Groq (Llama 4, Gemma 3, DeepSeek R1, Qwen 3, and more)
- **Multi-agent orchestration** — planner, coder, researcher, and reviewer agents working in parallel
- **GitHub integration** — connect any repo and let AI read, analyze, and fix your code
- **CLI tool** (`cf`) — `ask`, `fix`, `explain`, `commit`, `generate`, `analyze` from any terminal
- **VS Code extension** — AI chat, bug fixes, and code generation inside your editor
- **WhatsApp bot** — get code answers via Twilio on WhatsApp
- **Security scanning** — automated detection of secrets, SQL injection, XSS, and OWASP issues

---

## 🚀 Quick start (local)

### Prerequisites
- Node.js ≥ 18, Python ≥ 3.11
- An [OpenRouter](https://openrouter.ai/keys) API key (free tier: 10 models)
- A [Groq](https://console.groq.com/keys) API key (free tier: 8 fast models)
- A GitHub OAuth App ([create one](https://github.com/settings/developers))
- MongoDB Atlas (optional — runs in offline mode without it)

### 1. Clone the repo

```bash
git clone https://github.com/yathik-2622/CodeForge-AI.git
cd CodeForge-AI
```

### 2. Start the Node API

```bash
cd node_api
cp .env.example .env     # fill in your keys (see table below)
npm install
npm run dev              # starts on http://localhost:3000
```

### 3. Start the frontend

```bash
cd ../frontend
# frontend/.env is already committed with VITE_API_URL=http://localhost:3000
npm install
npm run dev              # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

### 4. Install the CLI

```bash
cd ../cli
npm install
npm run build
npm link
cf --version             # verify
```

---

## 🔑 Environment variables

### `node_api/.env`

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) — free tier gives 10 models |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) — free tier |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `SESSION_SECRET` | Any random 32+ character string |
| `FRONTEND_URL` | Where the frontend runs — **must be `http://localhost:5173`** for local dev |
| `MONGODB_URL` | MongoDB Atlas connection string (optional — offline mode without it) |
| `MONGODB_DB` | Database name (default: `codeforge`) |

### GitHub OAuth App setup

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Create a new OAuth App with:
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`

---

## 🤖 Free AI models

### OpenRouter (13 models)
| Model | Context |
|---|---|
| meta-llama/llama-3.2-3b-instruct:free | 128k |
| meta-llama/llama-3.1-8b-instruct:free | 128k |
| google/gemma-3-12b-it:free | 128k |
| deepseek/deepseek-r1:free | 163k |
| deepseek/deepseek-r1-distill-llama-70b:free | 128k |
| qwen/qwen-2.5-7b-instruct:free | 128k |
| mistralai/mistral-nemo:free | 128k |
| microsoft/phi-3-mini-128k-instruct:free | 128k |
| mistralai/mistral-small-3.2-24b-instruct:free | 128k |
| openchat/openchat-7b:free | 8k |

### Groq (8 models — blazing fast)
| Model |
|---|
| llama-3.3-70b-versatile |
| llama-3.1-8b-instant |
| meta-llama/llama-4-scout-17b-16e-instruct |
| compound-beta |
| compound-beta-mini |
| qwen/qwen3-32b |
| openai/gpt-oss-120b |
| openai/gpt-oss-20b |

---

## 💻 CLI usage (`cf`)

```bash
cf config set openRouterKey sk-or-v1-...   # set your OpenRouter key
cf config set groqKey gsk_...              # set your Groq key
cf config set model groq/llama-3.3-70b-versatile   # choose a model

cf ask "how do I debounce in React?"       # chat with AI
cf fix src/app.ts                          # auto-fix a file
cf explain src/main.py                     # plain-English explanation
cf commit                                  # AI-generated commit message
cf generate "REST API with auth"           # generate a complete file
cf analyze src/auth.ts                     # deep review + security scan
cf models                                  # list all 23 free models
```

---

## 🏗️ Project structure

```
CodeForge-AI/
├── frontend/          # React + Vite + Tailwind frontend (port 5173)
├── node_api/          # Node.js + Express API (port 3000)
├── backend/           # Python FastAPI backend (port 9000)
├── cli/               # `cf` CLI tool (npm package)
├── vscode-extension/  # VS Code extension
└── whatsapp-bot/      # WhatsApp bot via Twilio
```

---

## 📝 License

MIT © [yathik-2622](https://github.com/yathik-2622)

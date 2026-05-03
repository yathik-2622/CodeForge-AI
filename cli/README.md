# CodeForge AI CLI

An autonomous coding agent in your terminal — similar to Claude Code and OpenAI Codex CLI.

## Install

```bash
cd cli
npm install
npm run build
npm link          # makes `codeforge` and `cf` available globally
```

## Setup

Add your API keys to `~/.codeforge/config.json` or set environment variables:

```bash
# Option 1: Environment variables (works automatically)
export OPENROUTER_API_KEY=sk-or-...   # free at openrouter.ai
export GROQ_API_KEY=gsk_...           # free at console.groq.com

# Option 2: CLI config command
codeforge config --model groq/llama-3.3-70b-versatile
```

## Commands

### Interactive Chat (default)
```bash
codeforge          # or just: cf
codeforge chat
codeforge chat --model groq/llama-4-maverick-17b-128e-instruct-fp8
```

Slash commands inside chat:
| Command | Action |
|---------|--------|
| `/help` | Show help |
| `/models` | List all models |
| `/model <id>` | Switch model |
| `/clear` | Clear history |
| `/status` | Git status |
| `/exit` | Quit |

### One-shot Ask
```bash
cf ask "What is the time complexity of quicksort?"
cf ask "Write a Python function to parse JWT tokens"
```

### Fix Code
```bash
cf fix src/auth.ts                           # AI finds & fixes issues
cf fix src/auth.ts --issue "null pointer"    # specific issue
cf fix src/auth.ts --apply                   # auto-apply without prompt
```

### Explain Code
```bash
cf explain src/complex-algorithm.ts
cf explain backend/app/agents/graph.py --expert
cf explain README.md --simple
```

### Analyze Project
```bash
cf analyze .                   # full project analysis
cf analyze src/api.ts          # single file
cf analyze . --security        # security-focused
cf analyze . --perf            # performance-focused
```

### AI Commit Messages
```bash
cf commit              # analyze staged diff, generate message
cf commit --all        # stage all changes first, then commit
```

### Model Management
```bash
cf models              # list all 23 models
cf config              # show current config
cf status              # check API keys + server
```

## Models Available

### OpenRouter (Free, no GPU needed)
- `mistralai/mistral-7b-instruct:free`
- `meta-llama/llama-3.1-8b-instruct:free`
- `deepseek/deepseek-r1:free` (reasoning)
- `google/gemma-3-12b-it:free`
- and 7 more...

### Groq (Ultra-fast inference)
- `groq/meta-llama/llama-4-maverick-17b-128e-instruct-fp8` 🔥 New
- `groq/meta-llama/llama-4-scout-17b-16e-instruct` 🔥 New
- `groq/llama-3.3-70b-versatile`
- `groq/qwen-qwq-32b` (reasoning)
- `groq/compound-beta` (agentic)
- and 7 more...

## Config File

Located at `~/.codeforge/config.json`:

```json
{
  "model": "groq/llama-3.3-70b-versatile",
  "openrouterApiKey": "sk-or-...",
  "groqApiKey": "gsk_...",
  "serverUrl": "http://localhost:3000",
  "autoApply": false
}
```

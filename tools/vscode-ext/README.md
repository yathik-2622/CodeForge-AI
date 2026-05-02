# CodeForge AI — VS Code Extension

Autonomous AI coding agent directly in VS Code. Chat, explain code, fix bugs, and generate tests — powered by free open-source LLMs.

## Features

- **Sidebar chat** — Full streaming AI chat in the VS Code sidebar
- **Explain code** — Select any code → explain it in plain English
- **Fix code** — Select buggy code → get it fixed automatically  
- **Generate tests** — Select a function → generate unit tests
- **Web search** — Agents search the web for docs and best practices
- **GitHub context** — Works with your connected GitHub repos

## Quick Start

1. Install the extension (see [User Guide](../../docs/user-guide.md#vs-code-extension))
2. Set your server URL: `Ctrl+Shift+P` → **CodeForge AI: Set Server URL**
3. Open the sidebar: click the `⚡` icon in the Activity Bar
4. Select code, right-click → **CodeForge AI** to use AI actions

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Open CodeForge sidebar |
| `Ctrl+Shift+E` | Explain selected code |
| `Ctrl+Shift+F` | Fix selected code |

## Building from Source

```bash
cd tools/vscode-ext
npm install
npm run build
npm run package   # creates .vsix file
code --install-extension codeforge-ai-1.0.0.vsix
```

## Requirements

- VS Code 1.85+
- A running CodeForge AI server (see main [README](../../README.md))

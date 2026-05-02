# CodeForge AI — React Frontend

> **The interface for CodeForge AI** — a modern React application with real-time AI streaming, collaborative sessions, and GitHub repository integration.

This is the user interface (what you see in the browser). It's built with React and communicates with the Python backend to show AI responses, manage repositories, and display GitHub data.

---

## Table of Contents

1. [What This Does](#what-this-does)
2. [Technology Stack](#technology-stack)
3. [Pages and Features](#pages-and-features)
4. [Quick Start](#quick-start)
5. [Project Structure](#project-structure)
6. [Connecting to the Backend](#connecting-to-the-backend)
7. [Key Components](#key-components)
8. [How AI Streaming Works](#how-ai-streaming-works)

---

## What This Does

This frontend provides:
- **Dashboard** — Overview of sessions, repos, and activity
- **Chat** — Real-time AI conversations with code highlighting and SSE streaming
- **Repositories** — Browse and scan GitHub repos for AI context
- **Collapsible Sidebar** — Toggle between full and icon-only navigation
- **Collaborative Sessions** — Multiple users see the same AI response streaming live (WebSocket)
- **WhatsApp Settings** — Configure WhatsApp integration
- **Instagram Settings** — Configure Instagram DM integration
- **GitHub OAuth Login** — Sign in with your GitHub account

> **Note:** In this monorepo, the frontend code lives at `artifacts/codeforge/src/`. The `frontend/` directory contains this README as a reference guide. The actual running app is the `artifacts/codeforge: web` workflow.

---

## Technology Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool (fast hot reload) |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Wouter** | Client-side routing |
| **TanStack Query** | Server state management |
| **Lucide React** | Icons |
| **shadcn/ui** | Pre-built UI components |

---

## Pages and Features

### Dashboard (`/`)
Shows an overview of:
- Total chat sessions
- Connected repositories
- Messages sent
- Recent activity

### Chat Sessions (`/chat`)
- List all your chat sessions
- Create new sessions
- See message counts and last activity

### Chat (`/chat/:id`)
- Real-time AI streaming (you see each word as it's generated)
- Code blocks with syntax highlighting
- Share button (copies link for collaboration)
- Live participant avatars (see who else is in the session)
- AI typing indicator while generating

### Repositories (`/repositories`)
- List connected GitHub repos
- Connect new repos by pasting URL
- View scan status (pending / scanning / ready)
- Once scanned, AI knows the repo's structure

### Repository Detail (`/repositories/:id`)
- Detailed scan results
- Language breakdown
- Detected frameworks
- File structure

### Terminal (`/terminal`)
- Browser-based terminal simulation
- Run commands through the AI

### Security (`/security`)
- Security scan interface

### Deployments (`/deployments`)
- Deployment management interface

### WhatsApp (`/whatsapp`)
- Step-by-step Twilio WhatsApp setup guide
- Webhook URL display
- Environment variable instructions

### Instagram (`/instagram`)  ← NEW
- Step-by-step Twilio Instagram setup guide
- Webhook URL display
- Environment variable instructions
- Available DM commands

---

## Quick Start

The frontend is part of the pnpm monorepo. To run it:

```bash
# From the project root
pnpm install

# Run the frontend dev server
PORT=5173 pnpm --filter @workspace/codeforge run dev
```

Open: http://localhost:5173

---

## Project Structure

```
artifacts/codeforge/
├── src/
│   ├── App.tsx                    # Router — all page routes defined here
│   ├── main.tsx                   # Entry point (React root)
│   │
│   ├── components/
│   │   ├── Layout.tsx             # Collapsible sidebar + page wrapper
│   │   ├── Layout.tsx             # Reusable PageHeader component
│   │   └── ui/                    # shadcn/ui components (Button, Input, etc.)
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx          # Home page
│   │   ├── Sessions.tsx           # Chat session list
│   │   ├── Chat.tsx               # Main chat page with SSE streaming
│   │   ├── Repositories.tsx       # Repo list
│   │   ├── RepositoryDetail.tsx   # Single repo view
│   │   ├── Terminal.tsx
│   │   ├── Security.tsx
│   │   ├── Deployments.tsx
│   │   ├── WhatsApp.tsx           # WhatsApp setup page
│   │   ├── Instagram.tsx          # Instagram setup page ← NEW
│   │   ├── Login.tsx
│   │   └── not-found.tsx
│   │
│   └── lib/
│       ├── auth.tsx               # GitHub auth context and hooks
│       ├── api.ts                 # API client functions
│       └── utils.ts               # Utility functions
│
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Connecting to the Backend

The frontend connects to the Express backend (TypeScript) at `/api`.

To switch to the Python backend instead:
1. Make sure the Python backend is running on port 9000
2. The Replit proxy routes `/api` requests to the backend automatically
3. Or in development, update `vite.config.ts` proxy target to `http://localhost:9000`

---

## Key Components

### Layout.tsx — Collapsible Sidebar

The sidebar can be toggled between full (labels + icons) and collapsed (icons only) by clicking the toggle button in the top-right of the sidebar.

When collapsed:
- Only shows icons
- Hovering an icon shows a tooltip with the label
- User avatar is shown without the username
- Version badge is hidden

### Chat.tsx — AI Streaming

The chat page streams AI responses in real time using the EventSource API:

```
User types message
        ↓
POST /api/sessions/{id}/messages  (save the message)
        ↓
POST /api/sessions/{id}/stream    (start SSE stream)
        ↓
Server sends events:
  event: token  data: {"token": "Hello"}
  event: token  data: {"token": " world"}
  event: done   data: {"message_id": "abc123"}
        ↓
Frontend appends each token to the displayed message
```

---

## How AI Streaming Works

1. User types a message and hits Enter
2. Frontend saves the message: `POST /api/sessions/{id}/messages`
3. Frontend opens a streaming connection: `POST /api/sessions/{id}/stream`
4. The server streams tokens using Server-Sent Events format:
   ```
   event: token
   data: {"token": "Here "}
   
   event: token
   data: {"token": "is "}
   
   event: token
   data: {"token": "your code:"}
   
   event: done
   data: {"message_id": "abc123"}
   ```
5. Each token is appended to the message bubble immediately
6. Same tokens are broadcast via WebSocket to all collaborators
7. When `done` event arrives, the full message is saved

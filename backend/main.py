"""
=============================================================================
CodeForge AI — Python Backend Entry Point
=============================================================================

This is where the FastAPI application is created and configured.
Run this file to start the backend server:

    cd backend
    uvicorn main:app --host 0.0.0.0 --port 9000 --reload

The server will be available at: http://localhost:9000
API docs (auto-generated): http://localhost:9000/docs
Interactive API docs:       http://localhost:9000/redoc

Architecture:
    ┌──────────────────────────────────────────────────────────────┐
    │                    FastAPI Application                        │
    │                                                              │
    │  Routes:                                                     │
    │  /api/health       → Health check                            │
    │  /api/auth/*       → GitHub OAuth login                      │
    │  /api/sessions/*   → Chat sessions + AI streaming (SSE)      │
    │  /api/repositories → GitHub repo management                  │
    │  /api/search/*     → Tavily web search                       │
    │  /api/whatsapp/*   → WhatsApp Twilio webhook                 │
    │  /api/instagram/*  → Instagram Twilio webhook                │
    │  /api/dashboard/*  → Dashboard statistics                    │
    │                                                              │
    │  Database: MongoDB (via Motor async driver)                  │
    │  Vectors:  Qdrant (semantic code search)                     │
    │  AI:       LangGraph + LangChain + OpenRouter (free models)  │
    │  Agents:   Supervisor → Researcher → Coder pipeline          │
    │  Auth:     GitHub OAuth 2.0 + JWT cookies                    │
    │  RT:       WebSockets for collaborative sessions             │
    └──────────────────────────────────────────────────────────────┘

=============================================================================
"""

import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Import all routes ──────────────────────────────────────────────────────────
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.sessions import router as sessions_router
from app.routes.repositories import router as repositories_router
from app.routes.search import router as search_router
from app.routes.whatsapp import router as whatsapp_router
from app.routes.instagram import router as instagram_router
from app.routes.dashboard import router as dashboard_router

# ── Import database startup/shutdown ─────────────────────────────────────────
from app.db.mongo import connect_db, disconnect_db
from app.db.qdrant import ensure_collection, get_qdrant
from app.config import settings

# ── Configure Logging ─────────────────────────────────────────────────────────
# This sets up structured logging for the entire application.
# Every log message will show: timestamp, level, logger name, and message.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),  # Print to terminal
    ],
)

# Reduce noisy library logs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("motor").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

log = logging.getLogger("codeforge.main")


# ── Application Lifespan ──────────────────────────────────────────────────────
# FastAPI lifespan handles startup and shutdown events.
# Code before yield = runs on startup
# Code after yield  = runs on shutdown

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize all services on startup, clean up on shutdown."""
    log.info("=" * 60)
    log.info("  ⚡ CodeForge AI Backend Starting")
    log.info("=" * 60)
    log.info(f"  Port:    {settings.PORT}")
    log.info(f"  MongoDB: {settings.MONGODB_URL}")
    log.info(f"  Qdrant:  {settings.QDRANT_URL or 'in-memory'}")
    log.info(f"  AI:      {'✅ OpenRouter configured' if settings.OPENROUTER_API_KEY else '⚠️  OPENROUTER_API_KEY not set'}")
    log.info(f"  Search:  {'✅ Tavily configured' if settings.TAVILY_API_KEY else '⚠️  TAVILY_API_KEY not set (search disabled)'}")
    log.info("=" * 60)

    # Connect to MongoDB
    await connect_db()

    # Initialize Qdrant collection
    try:
        get_qdrant()  # Creates the client
        await ensure_collection()
        log.info("✅ Qdrant ready")
    except Exception as e:
        log.warning(f"Qdrant initialization warning: {e}")

    log.info("✅ All services ready — CodeForge AI is running!")
    log.info(f"   API docs: http://localhost:{settings.PORT}/docs")
    log.info(f"   Health:   http://localhost:{settings.PORT}/api/health")

    yield  # ← Application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────────
    log.info("Shutting down CodeForge AI...")
    await disconnect_db()
    log.info("Goodbye! ✅")


# ── Create FastAPI Application ────────────────────────────────────────────────
app = FastAPI(
    title="CodeForge AI API",
    description="""
    ## CodeForge AI — Autonomous Coding Agent Backend

    Built with:
    - **FastAPI** — Modern async Python web framework
    - **LangGraph** — Multi-agent AI workflow graph
    - **LangChain** — LLM orchestration and tool use
    - **MongoDB** — Document database (via Motor async driver)
    - **Qdrant** — Vector database for semantic code search
    - **WebSockets** — Real-time collaborative sessions

    ### Authentication
    Use GitHub OAuth: `GET /api/auth/github`
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",      # Swagger UI at /docs
    redoc_url="/redoc",    # ReDoc at /redoc
)


# ── CORS Middleware ───────────────────────────────────────────────────────────
# CORS (Cross-Origin Resource Sharing) allows the frontend (different port)
# to make requests to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,      # Your React frontend URL
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",    # Alternative dev port
        "http://localhost:4173",    # Vite preview
        "*",                        # Allow all in development (restrict in prod!)
    ],
    allow_credentials=True,         # Allow cookies (required for JWT auth)
    allow_methods=["*"],            # Allow all HTTP methods
    allow_headers=["*"],            # Allow all headers
)


# ── Register All Route Handlers ───────────────────────────────────────────────
# Each router handles a specific group of endpoints.
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(repositories_router)
app.include_router(search_router)
app.include_router(whatsapp_router)
app.include_router(instagram_router)
app.include_router(dashboard_router)


# ── Root Redirect ─────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """API root — redirects to the docs."""
    return {
        "name": "CodeForge AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "status": "running",
    }


# ── Run Directly ──────────────────────────────────────────────────────────────
# This block only runs when you execute: python main.py
# In production, use: uvicorn main:app --host 0.0.0.0 --port 9000

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,       # Auto-reload when files change
        log_level="info",
    )

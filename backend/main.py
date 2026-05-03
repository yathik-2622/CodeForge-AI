import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.sessions import router as sessions_router
from app.routes.repositories import router as repositories_router
from app.routes.search import router as search_router
from app.routes.whatsapp import router as whatsapp_router
from app.routes.instagram import router as instagram_router
from app.routes.dashboard import router as dashboard_router
from app.routes.models import router as models_router
from app.db.mongo import connect_db, disconnect_db
from app.db.qdrant import ensure_collection, get_qdrant
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("motor").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sentence_transformers").setLevel(logging.WARNING)

log = logging.getLogger("codeforge.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("=" * 60)
    log.info("  ⚡ CodeForge AI — Backend Starting")
    log.info("=" * 60)
    log.info(f"  AI Model  : {settings.DEFAULT_MODEL}")
    log.info(f"  OpenRouter: {'✅' if settings.OPENROUTER_API_KEY else '❌ missing'}")
    log.info(f"  Groq      : {'✅' if settings.GROQ_API_KEY else '⚠️  not configured'}")
    log.info(f"  Tavily    : {'✅' if settings.TAVILY_API_KEY else '⚠️  web search disabled'}")
    log.info(f"  GitHub    : {'✅' if settings.GITHUB_CLIENT_ID else '⚠️  OAuth not configured'}")
    log.info("=" * 60)

    await connect_db()

    try:
        get_qdrant()
        await ensure_collection()
        log.info("✅ Qdrant ready")
    except Exception as e:
        log.warning(f"Qdrant warning (non-fatal): {e}")

    log.info("✅ CodeForge AI is running!")
    log.info(f"   Docs   : http://localhost:{settings.PORT}/docs")
    log.info(f"   Health : http://localhost:{settings.PORT}/api/health")
    log.info(f"   Models : http://localhost:{settings.PORT}/api/models")

    yield

    log.info("Shutting down...")
    await disconnect_db()


app = FastAPI(
    title="CodeForge AI API",
    description="Autonomous AI coding agent — LangGraph + FastAPI + MongoDB Atlas",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(health_router)
app.include_router(models_router)
app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(repositories_router)
app.include_router(search_router)
app.include_router(whatsapp_router)
app.include_router(instagram_router)
app.include_router(dashboard_router)

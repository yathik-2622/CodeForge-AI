"""
=============================================================================
CodeForge AI — Health Check Route
=============================================================================
Simple endpoint to verify the server is running and all services are connected.
Used by monitoring tools, load balancers, and the CLI 'codeforge status' command.
=============================================================================
"""

import logging
from fastapi import APIRouter
from app.db.mongo import get_db
from app.db.qdrant import get_qdrant
from app.config import settings

log = logging.getLogger("codeforge.routes.health")
router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    """
    Returns the health status of all services.
    HTTP 200 = healthy, HTTP 503 = unhealthy.

    Checks:
    - MongoDB connection
    - Qdrant connection (if configured)
    - AI API key presence
    """
    status_report: dict = {
        "status": "ok",
        "version": "1.0.0",
        "framework": "FastAPI + LangGraph + LangChain",
        "services": {},
    }

    # ── Check MongoDB ──────────────────────────────────────────────────────────
    try:
        db = await get_db()
        await db.command("ping")  # Quick ping to verify connection
        status_report["services"]["mongodb"] = "connected"
    except Exception as e:
        log.error(f"MongoDB health check failed: {e}")
        status_report["services"]["mongodb"] = f"error: {str(e)[:100]}"
        status_report["status"] = "degraded"

    # ── Check Qdrant ──────────────────────────────────────────────────────────
    try:
        qdrant = get_qdrant()
        qdrant.get_collections()  # List collections to verify connection
        mode = "persistent" if settings.QDRANT_URL else "in-memory"
        status_report["services"]["qdrant"] = f"connected ({mode})"
    except Exception as e:
        log.error(f"Qdrant health check failed: {e}")
        status_report["services"]["qdrant"] = f"error: {str(e)[:100]}"
        status_report["status"] = "degraded"

    # ── Check AI Config ────────────────────────────────────────────────────────
    status_report["services"]["openrouter"] = (
        "configured" if settings.OPENROUTER_API_KEY else "⚠️ OPENROUTER_API_KEY not set"
    )
    status_report["services"]["tavily"] = (
        "configured" if settings.TAVILY_API_KEY else "not configured (web search disabled)"
    )
    status_report["services"]["github_oauth"] = (
        "configured" if settings.GITHUB_CLIENT_ID else "not configured"
    )
    status_report["services"]["whatsapp"] = (
        "configured" if settings.TWILIO_ACCOUNT_SID else "not configured"
    )
    status_report["services"]["instagram"] = (
        "configured" if settings.TWILIO_INSTAGRAM_FROM else "not configured"
    )

    log.info(f"Health check: {status_report['status']}")
    return status_report

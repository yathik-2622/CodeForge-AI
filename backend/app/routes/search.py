"""
=============================================================================
CodeForge AI — Web Search Route
=============================================================================
Exposes the Tavily web search as an API endpoint.
Used by the CLI 'codeforge search' command and the frontend.
=============================================================================
"""

import logging
from fastapi import APIRouter, Query
from app.lib.search import web_search
from app.config import settings

log = logging.getLogger("codeforge.routes.search")
router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/web")
async def search_web(
    q: str = Query(..., min_length=1, description="Search query"),
    max_results: int = Query(default=5, ge=1, le=10),
):
    """
    Search the web using Tavily AI and return clean, structured results.

    Args:
        q:           The search query
        max_results: Maximum results to return (1-10)

    Returns:
        {"results": [...], "configured": true/false}
    """
    log.info(f"Web search: '{q}' (max_results={max_results})")
    results = await web_search(q, max_results=max_results)
    return {
        "query": q,
        "results": results,
        "configured": bool(settings.TAVILY_API_KEY),
        "result_count": len(results),
    }


@router.get("/models")
async def list_models():
    """Return the list of available free AI models."""
    return {"models": settings.FREE_MODELS}

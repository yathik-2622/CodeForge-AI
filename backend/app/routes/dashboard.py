"""
=============================================================================
CodeForge AI — Dashboard Statistics Route
=============================================================================
Returns aggregated statistics for the main dashboard page.
=============================================================================
"""

import logging
from fastapi import APIRouter, Depends
from app.db.mongo import sessions_col, messages_col, repositories_col
from app.middleware.auth import get_current_user_optional

log = logging.getLogger("codeforge.routes.dashboard")
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(user: dict | None = Depends(get_current_user_optional)):
    """Return aggregate stats for the dashboard overview cards."""
    sessions = await sessions_col()
    messages = await messages_col()
    repos = await repositories_col()

    # Count totals
    total_sessions = await sessions.count_documents({})
    active_sessions = await sessions.count_documents({"status": "active"})
    total_messages = await messages.count_documents({})
    total_repos = await repos.count_documents({})

    return {
        "sessions": total_sessions,
        "active_sessions": active_sessions,
        "messages": total_messages,
        "repositories": total_repos,
        "lines_generated": total_messages * 15,  # Estimate
    }

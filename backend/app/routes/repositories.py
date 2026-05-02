"""
=============================================================================
CodeForge AI — Repository Management Routes
=============================================================================

Handles GitHub repository connections and scanning:

    GET    /api/repositories              → List connected repos
    POST   /api/repositories              → Connect a new repo
    GET    /api/repositories/{id}         → Get repo details
    POST   /api/repositories/{id}/scan   → Trigger a deep scan
    GET    /api/github/repos              → Browse user's GitHub repos (OAuth)
    GET    /api/github/search?q=...       → Search public GitHub repos

=============================================================================
"""

import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from pydantic import BaseModel
from app.db.mongo import repositories_col
from app.lib.github_client import list_user_repos, search_repos, scan_repository
from app.middleware.auth import get_current_user_optional
from app.models.repository import RepositoryResponse

log = logging.getLogger("codeforge.routes.repositories")
router = APIRouter(tags=["repositories"])


class ConnectRepoRequest(BaseModel):
    """Request body for connecting a repository."""
    full_name: str   # e.g. "username/my-repo"
    url: str         # GitHub HTML URL
    description: str = ""
    language: str = "Unknown"
    stars: int = 0
    forks: int = 0
    private: bool = False
    clone_url: str = ""


# ── GET /api/repositories — List connected repos ──────────────────────────────

@router.get("/api/repositories")
async def list_repositories(user: dict | None = Depends(get_current_user_optional)):
    """List all repositories connected to CodeForge AI."""
    col = await repositories_col()
    query = {"user_id": ObjectId(str(user["_id"]))} if user else {}
    cursor = col.find(query).sort("updated_at", -1).limit(50)
    repos = await cursor.to_list(length=50)
    return [RepositoryResponse.from_mongo(r) for r in repos]


# ── POST /api/repositories — Connect a repo ───────────────────────────────────

@router.post("/api/repositories", status_code=201)
async def connect_repository(
    body: ConnectRepoRequest,
    user: dict | None = Depends(get_current_user_optional),
):
    """Connect a GitHub repository to CodeForge AI."""
    log.info(f"Connecting repository: {body.full_name}")
    col = await repositories_col()
    now = datetime.utcnow()

    repo_doc = {
        "full_name": body.full_name,
        "name": body.full_name.split("/")[-1],
        "description": body.description,
        "url": body.url,
        "clone_url": body.clone_url or f"https://github.com/{body.full_name}.git",
        "language": body.language,
        "stars": body.stars,
        "forks": body.forks,
        "private": body.private,
        "status": "pending",
        "scan_data": None,
        "user_id": ObjectId(str(user["_id"])) if user else None,
        "created_at": now,
        "updated_at": now,
    }

    result = await col.insert_one(repo_doc)
    repo_doc["_id"] = result.inserted_id
    log.info(f"Repository connected: {body.full_name} (id={result.inserted_id})")
    return RepositoryResponse.from_mongo(repo_doc)


# ── GET /api/repositories/{id} — Get a single repo ────────────────────────────

@router.get("/api/repositories/{repo_id}")
async def get_repository(repo_id: str):
    """Get details of a connected repository."""
    col = await repositories_col()
    try:
        repo = await col.find_one({"_id": ObjectId(repo_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid repository ID")

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    return RepositoryResponse.from_mongo(repo)


# ── POST /api/repositories/{id}/scan — Scan a repo ────────────────────────────

@router.post("/api/repositories/{repo_id}/scan")
async def scan_repo(
    repo_id: str,
    user: dict | None = Depends(get_current_user_optional),
):
    """
    Trigger a deep scan of a repository.
    Detects languages, frameworks, file structure, CI/CD, etc.
    After scanning, the AI can answer questions about the repo's codebase.
    """
    log.info(f"Scanning repository: {repo_id}")
    col = await repositories_col()

    try:
        repo = await col.find_one({"_id": ObjectId(repo_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid repository ID")

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Update status to "scanning"
    await col.update_one(
        {"_id": ObjectId(repo_id)},
        {"$set": {"status": "scanning", "updated_at": datetime.utcnow()}},
    )

    try:
        # Get the user's GitHub token if available
        github_token = user.get("github_token") if user else None
        scan_data = await scan_repository(repo["full_name"], github_token)

        # Save scan results
        await col.update_one(
            {"_id": ObjectId(repo_id)},
            {"$set": {
                "status": "ready",
                "scan_data": scan_data,
                "updated_at": datetime.utcnow(),
            }},
        )
        log.info(f"✅ Repository scan complete: {repo['full_name']}")
        return {"status": "ready", "scan_data": scan_data}

    except Exception as e:
        log.error(f"Repository scan failed: {e}")
        await col.update_one(
            {"_id": ObjectId(repo_id)},
            {"$set": {"status": "error", "updated_at": datetime.utcnow()}},
        )
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


# ── GET /api/github/repos — Browse user's GitHub repos ────────────────────────

@router.get("/api/github/repos")
async def browse_github_repos(
    page: int = Query(default=1, ge=1),
    user: dict | None = Depends(get_current_user_optional),
):
    """
    List the authenticated user's GitHub repositories.
    Requires the user to be logged in with GitHub.
    """
    if not user or not user.get("github_token"):
        raise HTTPException(
            status_code=401,
            detail="Please sign in with GitHub to browse your repositories."
        )

    repos = await list_user_repos(user["github_token"], page=page)
    return repos


# ── GET /api/github/search — Search public GitHub repos ───────────────────────

@router.get("/api/github/search")
async def search_github_repos(
    q: str = Query(..., min_length=1, description="Search query"),
    user: dict | None = Depends(get_current_user_optional),
):
    """Search public GitHub repositories by keyword."""
    github_token = user.get("github_token") if user else None
    repos = await search_repos(q, github_token)
    return {"results": repos, "total": len(repos)}

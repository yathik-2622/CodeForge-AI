"""
=============================================================================
CodeForge AI — GitHub API Client
=============================================================================

This module handles all communication with the GitHub REST API.
Used for:
    - OAuth login (exchanging code for access token)
    - Fetching user profile and repositories
    - Scanning repository file structure
    - Searching public repositories

GitHub API docs: https://docs.github.com/en/rest

=============================================================================
"""

import logging
import httpx
from typing import Optional
from app.config import settings

log = logging.getLogger("codeforge.lib.github")

GITHUB_API = "https://api.github.com"
GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token"


async def exchange_code_for_token(code: str) -> Optional[str]:
    """
    Exchange a GitHub OAuth code for an access token.

    OAuth flow:
        1. User clicks "Sign in with GitHub" → redirected to GitHub
        2. User authorizes → GitHub redirects to our callback with a "code"
        3. We exchange that code for a permanent access token (this function)
        4. We use the access token to read the user's profile

    Args:
        code: The OAuth code from GitHub's callback redirect

    Returns:
        GitHub access token string, or None if exchange failed
    """
    log.info("Exchanging GitHub OAuth code for access token")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            GITHUB_OAUTH_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        data = r.json()
        token = data.get("access_token")
        if token:
            log.info("✅ GitHub OAuth token obtained")
        else:
            log.error(f"GitHub OAuth failed: {data}")
        return token


async def get_github_user(access_token: str) -> Optional[dict]:
    """
    Fetch the authenticated user's GitHub profile.

    Args:
        access_token: GitHub OAuth access token

    Returns:
        User profile dict with keys: id, login, name, email, avatar_url, etc.
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        if r.status_code != 200:
            log.error(f"Failed to get GitHub user: {r.status_code} {r.text}")
            return None
        user = r.json()
        log.info(f"Fetched GitHub user: {user.get('login')}")
        return user


async def list_user_repos(access_token: str, page: int = 1) -> list[dict]:
    """
    List the authenticated user's GitHub repositories.

    Args:
        access_token: GitHub OAuth access token
        page:         Page number for pagination (30 repos per page)

    Returns:
        List of repository dicts
    """
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/user/repos",
            params={"per_page": 30, "page": page, "sort": "updated"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        if r.status_code != 200:
            log.error(f"Failed to list repos: {r.status_code}")
            return []
        repos = r.json()
        log.info(f"Fetched {len(repos)} repos (page {page})")
        return repos


async def search_repos(query: str, access_token: Optional[str] = None) -> list[dict]:
    """
    Search public GitHub repositories by keyword.

    Args:
        query:        Search query (e.g., "react typescript starter")
        access_token: Optional token for higher rate limits

    Returns:
        List of matching repository dicts
    """
    headers = {"Accept": "application/vnd.github.v3+json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GITHUB_API}/search/repositories",
            params={"q": query, "per_page": 10, "sort": "stars"},
            headers=headers,
        )
        if r.status_code != 200:
            log.error(f"GitHub search failed: {r.status_code}")
            return []
        data = r.json()
        return data.get("items", [])


async def scan_repository(full_name: str, access_token: Optional[str] = None) -> dict:
    """
    Perform a deep scan of a repository's structure.
    Detects language, frameworks, file counts, CI/CD tools, etc.

    Args:
        full_name:    "owner/repo" format
        access_token: Optional GitHub token for private repos

    Returns:
        Dict with scan results: frameworks, languages, file_count, etc.
    """
    log.info(f"Scanning repository: {full_name}")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    scan_result: dict = {
        "full_name": full_name,
        "frameworks": [],
        "languages": {},
        "file_count": 0,
        "has_dockerfile": False,
        "has_github_actions": False,
        "has_tests": False,
        "package_managers": [],
        "databases": [],
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Fetch repository info
        repo_r = await client.get(f"{GITHUB_API}/repos/{full_name}", headers=headers)
        if repo_r.status_code == 200:
            repo = repo_r.json()
            scan_result["description"] = repo.get("description", "")
            scan_result["default_branch"] = repo.get("default_branch", "main")

        # Fetch language breakdown (GitHub calculates this from file sizes)
        lang_r = await client.get(f"{GITHUB_API}/repos/{full_name}/languages", headers=headers)
        if lang_r.status_code == 200:
            scan_result["languages"] = lang_r.json()

        # Fetch top-level file tree
        tree_r = await client.get(
            f"{GITHUB_API}/repos/{full_name}/git/trees/HEAD",
            params={"recursive": "0"},
            headers=headers,
        )
        if tree_r.status_code == 200:
            tree = tree_r.json()
            files = [item["path"] for item in tree.get("tree", [])]
            scan_result["root_files"] = files[:50]  # Limit for safety

            # Detect key files
            scan_result["has_dockerfile"] = any("dockerfile" in f.lower() for f in files)
            scan_result["has_github_actions"] = ".github" in files
            scan_result["has_tests"] = any(f in ["tests", "test", "__tests__", "spec"] for f in files)

            # Detect package managers
            if "package.json" in files: scan_result["package_managers"].append("npm")
            if "requirements.txt" in files or "pyproject.toml" in files:
                scan_result["package_managers"].append("pip")
            if "go.mod" in files: scan_result["package_managers"].append("go")
            if "Cargo.toml" in files: scan_result["package_managers"].append("cargo")

            # Detect frameworks from package.json
            if "package.json" in files:
                pkg_r = await client.get(
                    f"{GITHUB_API}/repos/{full_name}/contents/package.json",
                    headers=headers,
                )
                if pkg_r.status_code == 200:
                    import base64, json
                    try:
                        content = base64.b64decode(pkg_r.json().get("content", "")).decode()
                        pkg = json.loads(content)
                        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                        if "react" in deps: scan_result["frameworks"].append("React")
                        if "next" in deps: scan_result["frameworks"].append("Next.js")
                        if "vue" in deps: scan_result["frameworks"].append("Vue.js")
                        if "express" in deps: scan_result["frameworks"].append("Express")
                        if "fastapi" in deps: scan_result["frameworks"].append("FastAPI")
                        if "django" in deps: scan_result["frameworks"].append("Django")
                    except Exception:
                        pass

    log.info(f"✅ Repository scan complete: {full_name}")
    return scan_result

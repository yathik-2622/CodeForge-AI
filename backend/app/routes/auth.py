"""
=============================================================================
CodeForge AI — GitHub OAuth Authentication Routes
=============================================================================

Handles the full GitHub OAuth 2.0 login flow:

    1. GET /api/auth/github
       → Redirects user to GitHub's authorization page

    2. GET /api/auth/github/callback?code=...
       → GitHub calls this after user approves
       → We exchange the code for a token, fetch the user's profile,
         save them in MongoDB, and set a JWT cookie

    3. GET /api/auth/me
       → Returns the current logged-in user's info (or 401 if not logged in)

    4. POST /api/auth/logout
       → Clears the JWT cookie

=============================================================================
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, Response, Request
from fastapi.responses import RedirectResponse
from bson import ObjectId
from app.config import settings
from app.lib.github_client import exchange_code_for_token, get_github_user
from app.lib.auth import create_access_token
from app.middleware.auth import get_current_user_optional, require_auth
from app.db.mongo import users_col
from app.models.user import UserResponse

log = logging.getLogger("codeforge.routes.auth")
router = APIRouter(prefix="/api/auth", tags=["auth"])

# Cookie configuration
COOKIE_NAME = "auth_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days in seconds


@router.get("/github")
async def github_login():
    """
    Step 1: Redirect the user to GitHub's OAuth authorization page.
    The user will see a GitHub page asking "Allow CodeForge AI to access your account?"
    """
    if not settings.GITHUB_CLIENT_ID:
        return {"error": "GitHub OAuth not configured. Set GITHUB_CLIENT_ID in .env"}

    # GitHub OAuth URL with required scopes
    # scope=repo: read/write access to repos
    # scope=read:user: read user profile
    github_oauth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=repo,read:user,user:email"
        f"&redirect_uri={settings.APP_URL}/api/auth/github/callback"
    )

    log.info("Redirecting user to GitHub OAuth")
    return RedirectResponse(url=github_oauth_url)


@router.get("/github/callback")
async def github_callback(code: str, response: Response):
    """
    Step 2: GitHub calls this URL after the user approves the OAuth request.
    We exchange the temporary code for a permanent access token,
    fetch the user's profile, and log them in.

    Args:
        code: Temporary authorization code from GitHub (expires in 10 minutes)
    """
    log.info("Received GitHub OAuth callback")

    # Exchange code → access token
    access_token = await exchange_code_for_token(code)
    if not access_token:
        log.error("Failed to exchange GitHub OAuth code for token")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")

    # Fetch user's GitHub profile using the access token
    github_user = await get_github_user(access_token)
    if not github_user:
        log.error("Failed to fetch GitHub user profile")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=profile_failed")

    # Upsert user in MongoDB (create if new, update if existing)
    col = await users_col()
    now = datetime.utcnow()

    result = await col.find_one_and_update(
        {"github_id": github_user["id"]},  # Find by GitHub ID
        {
            "$set": {
                "github_id": github_user["id"],
                "login": github_user["login"],
                "name": github_user.get("name"),
                "email": github_user.get("email"),
                "avatar_url": github_user.get("avatar_url"),
                "github_token": access_token,  # Store for API calls
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},  # Only set on first insert
        },
        upsert=True,           # Create if doesn't exist
        return_document=True,  # Return the updated document
    )

    user_id = str(result["_id"])
    log.info(f"✅ User logged in: {github_user['login']} (id={user_id})")

    # Create JWT token and set it as an httpOnly cookie
    # httpOnly = JavaScript cannot read it (protection against XSS attacks)
    jwt_token = create_access_token(user_id)

    redirect_url = f"{settings.FRONTEND_URL}/"
    redirect_response = RedirectResponse(url=redirect_url)
    redirect_response.set_cookie(
        key=COOKIE_NAME,
        value=jwt_token,
        httponly=True,    # Can't be read by JavaScript
        secure=False,     # Set to True in production (HTTPS)
        samesite="lax",   # Protects against CSRF attacks
        max_age=COOKIE_MAX_AGE,
    )

    return redirect_response


@router.get("/me")
async def get_me(user: dict | None = Depends(get_current_user_optional)):
    """
    Returns the current logged-in user's profile.
    Returns 401 if not authenticated (this is normal for anonymous users).
    """
    if not user:
        return Response(status_code=401)

    return UserResponse.from_mongo(user)


@router.post("/logout")
async def logout(response: Response):
    """Clear the auth cookie, effectively logging the user out."""
    response.delete_cookie(key=COOKIE_NAME)
    log.info("User logged out")
    return {"message": "Logged out successfully"}

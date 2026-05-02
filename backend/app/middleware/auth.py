"""
=============================================================================
CodeForge AI — Authentication Middleware
=============================================================================

FastAPI dependency that reads the JWT token from the request cookie
and returns the current user (or None for unauthenticated requests).

Usage in routes:
    # Optional auth (works with or without login)
    async def my_route(user=Depends(get_current_user_optional)):
        if user:
            print(f"Hello {user['login']}")
        else:
            print("Anonymous user")

    # Required auth (returns 401 if not logged in)
    async def protected_route(user=Depends(require_auth)):
        print(f"Hello {user['login']}")

=============================================================================
"""

import logging
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from bson import ObjectId
from app.lib.auth import decode_access_token
from app.db.mongo import users_col

log = logging.getLogger("codeforge.middleware.auth")

# Cookie name — must match what the auth route sets
AUTH_COOKIE_NAME = "auth_token"


async def get_current_user_optional(request: Request) -> Optional[dict]:
    """
    Try to get the current user from the JWT cookie.
    Returns None if not logged in (no error thrown).
    Use this for endpoints that work for both logged-in and anonymous users.
    """
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        return None

    user_id = decode_access_token(token)
    if not user_id:
        return None

    # Look up the user in MongoDB
    try:
        col = await users_col()
        user = await col.find_one({"_id": ObjectId(user_id)})
        if not user:
            log.warning(f"JWT references non-existent user_id: {user_id}")
            return None
        return user
    except Exception as e:
        log.error(f"Auth lookup error: {e}")
        return None


async def require_auth(user: Optional[dict] = Depends(get_current_user_optional)) -> dict:
    """
    Require the user to be logged in.
    Raises HTTP 401 Unauthorized if not authenticated.
    Use this for endpoints that MUST have a logged-in user.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with GitHub.",
        )
    return user

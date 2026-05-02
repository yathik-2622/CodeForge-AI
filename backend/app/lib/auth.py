"""
=============================================================================
CodeForge AI — JWT Authentication Utilities
=============================================================================

JWT (JSON Web Token) is a secure way to prove who you are.
When you log in with GitHub, we create a JWT token and store it in a cookie.
On each request, we read the cookie and verify the token to know who you are.

Flow:
    1. User clicks "Sign in with GitHub"
    2. GitHub verifies their identity and sends us their profile
    3. We create a JWT token with their user ID
    4. We store the JWT in an httpOnly cookie (browser can't read it — more secure)
    5. On each API request, we decode the JWT to get the user ID
    6. We load the user from MongoDB using that ID

=============================================================================
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.config import settings

log = logging.getLogger("codeforge.lib.auth")


def create_access_token(user_id: str) -> str:
    """
    Create a JWT token that encodes the user's ID.

    Args:
        user_id: MongoDB ObjectId string of the user

    Returns:
        Signed JWT token string (stored in cookie)
    """
    expire = datetime.utcnow() + timedelta(days=settings.JWT_EXPIRE_DAYS)
    payload = {
        "sub": user_id,          # "sub" = subject = who this token belongs to
        "exp": expire,           # Expiry timestamp
        "iat": datetime.utcnow() # Issued at timestamp
    }
    token = jwt.encode(payload, settings.SESSION_SECRET, algorithm=settings.JWT_ALGORITHM)
    log.debug(f"Created JWT token for user_id={user_id}, expires={expire}")
    return token


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode and verify a JWT token.

    Args:
        token: The JWT token string from the cookie

    Returns:
        user_id string if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.SESSION_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")  # type: ignore
        if not user_id:
            log.warning("JWT token missing 'sub' field")
            return None
        return user_id
    except JWTError as e:
        log.warning(f"JWT decode error: {e}")
        return None

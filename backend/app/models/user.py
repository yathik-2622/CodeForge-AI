"""
=============================================================================
CodeForge AI — User Data Models
=============================================================================
Defines the structure of user accounts authenticated via GitHub OAuth.
=============================================================================
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserResponse(BaseModel):
    """A user account in CodeForge AI, authenticated via GitHub."""
    id: str                              # MongoDB ObjectId as string
    github_id: int                       # GitHub's numeric user ID
    login: str                           # GitHub username (e.g., "johndoe")
    name: Optional[str] = None           # Display name (e.g., "John Doe")
    email: Optional[str] = None          # GitHub email (may be private)
    avatar_url: Optional[str] = None     # Profile picture URL
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_mongo(cls, doc: dict) -> "UserResponse":
        """Convert a MongoDB document to a UserResponse."""
        return cls(
            id=str(doc["_id"]),
            github_id=doc["github_id"],
            login=doc["login"],
            name=doc.get("name"),
            email=doc.get("email"),
            avatar_url=doc.get("avatar_url"),
            created_at=doc.get("created_at", datetime.utcnow()),
            updated_at=doc.get("updated_at", datetime.utcnow()),
        )

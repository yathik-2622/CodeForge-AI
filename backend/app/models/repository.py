"""
=============================================================================
CodeForge AI — Repository Data Models
=============================================================================
Defines the structure of GitHub repositories connected to CodeForge AI.
=============================================================================
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel


class RepositoryResponse(BaseModel):
    """
    A GitHub repository connected to CodeForge AI.
    After scanning, the AI knows the repo's structure and can answer questions about it.
    """
    id: str                                                    # MongoDB ObjectId
    full_name: str                                             # e.g. "username/repo-name"
    name: str                                                  # e.g. "repo-name"
    description: Optional[str] = None                         # Repo description
    url: str                                                   # GitHub HTML URL
    clone_url: str                                             # Git clone URL
    language: str = "Unknown"                                  # Primary language
    stars: int = 0
    forks: int = 0
    private: bool = False
    status: Literal["pending", "scanning", "ready", "error"] = "pending"
    scan_data: Optional[dict] = None                          # Scan results
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_mongo(cls, doc: dict) -> "RepositoryResponse":
        return cls(
            id=str(doc["_id"]),
            full_name=doc.get("full_name", ""),
            name=doc.get("name", ""),
            description=doc.get("description"),
            url=doc.get("url", ""),
            clone_url=doc.get("clone_url", ""),
            language=doc.get("language", "Unknown"),
            stars=doc.get("stars", 0),
            forks=doc.get("forks", 0),
            private=doc.get("private", False),
            status=doc.get("status", "pending"),
            scan_data=doc.get("scan_data"),
            user_id=str(doc["user_id"]) if doc.get("user_id") else None,
            created_at=doc.get("created_at", datetime.utcnow()),
            updated_at=doc.get("updated_at", datetime.utcnow()),
        )

"""
=============================================================================
CodeForge AI — Session & Message Data Models
=============================================================================

Pydantic models define the shape of data.
They automatically validate that data has the right types and structure.

These models are used for:
    - Validating incoming API request bodies
    - Defining the shape of API responses
    - Type-checking throughout the application

MongoDB stores data as JSON-like documents (BSON).
We use Python dictionaries for MongoDB and Pydantic models for the API layer.

=============================================================================
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Request Bodies (what the API receives from the client) ───────────────────

class CreateSessionRequest(BaseModel):
    """Body for POST /api/sessions — create a new chat session."""
    title: str = Field(..., min_length=1, max_length=200, description="Session name shown in the UI")
    model: str = Field(default="mistralai/mistral-7b-instruct:free", description="AI model to use")
    repository_id: Optional[str] = Field(default=None, description="Optional linked GitHub repo ID")


class SendMessageRequest(BaseModel):
    """Body for POST /api/sessions/{id}/messages — send a message."""
    content: str = Field(..., min_length=1, max_length=50000, description="Message text")


# ── Response Models (what the API sends back to the client) ──────────────────

class SessionResponse(BaseModel):
    """
    A chat session — like a conversation thread in ChatGPT.
    One session contains many messages.
    """
    id: str                                    # MongoDB ObjectId as string
    title: str                                 # Human-readable name
    model: str                                 # Which AI model is used
    status: Literal["active", "idle", "error"] # Current state
    message_count: int = 0                     # Total messages in session
    repository_id: Optional[str] = None        # Linked GitHub repo (if any)
    user_id: Optional[str] = None             # Owner (if authenticated)
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_mongo(cls, doc: dict) -> "SessionResponse":
        """Convert a MongoDB document to a SessionResponse."""
        return cls(
            id=str(doc["_id"]),
            title=doc.get("title", "Untitled"),
            model=doc.get("model", "mistralai/mistral-7b-instruct:free"),
            status=doc.get("status", "idle"),
            message_count=doc.get("message_count", 0),
            repository_id=str(doc["repository_id"]) if doc.get("repository_id") else None,
            user_id=str(doc["user_id"]) if doc.get("user_id") else None,
            created_at=doc.get("created_at", datetime.utcnow()),
            updated_at=doc.get("updated_at", datetime.utcnow()),
        )


class MessageResponse(BaseModel):
    """
    A single message in a chat session.
    Can be from the user ("user") or from the AI ("agent"/"assistant").
    """
    id: str
    session_id: str
    role: Literal["user", "agent", "assistant", "system"]  # Who sent it
    content: str                                            # The message text
    agent_type: Optional[str] = None   # Which type of agent (coding, research, etc.)
    metadata: Optional[dict] = None    # Extra data (model used, search used, etc.)
    created_at: datetime

    @classmethod
    def from_mongo(cls, doc: dict) -> "MessageResponse":
        """Convert a MongoDB document to a MessageResponse."""
        return cls(
            id=str(doc["_id"]),
            session_id=str(doc["session_id"]),
            role=doc.get("role", "user"),
            content=doc.get("content", ""),
            agent_type=doc.get("agent_type"),
            metadata=doc.get("metadata"),
            created_at=doc.get("created_at", datetime.utcnow()),
        )

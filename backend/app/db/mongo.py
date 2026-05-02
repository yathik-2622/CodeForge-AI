"""
=============================================================================
CodeForge AI — MongoDB Database Client
=============================================================================

This module provides the async MongoDB connection using Motor.
Motor is the async version of PyMongo — it doesn't block the server
while waiting for database operations to complete.

Collections (like SQL "tables"):
    - users        : GitHub user accounts
    - sessions     : AI chat sessions
    - messages     : Individual chat messages
    - repositories : Connected GitHub repositories
    - agents       : AI agent instances

Usage:
    from app.db.mongo import get_db, collections
    db = await get_db()
    session = await collections.sessions.find_one({"_id": "..."})

=============================================================================
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

# Logger for this module — all logs will say "codeforge.db.mongo"
log = logging.getLogger("codeforge.db.mongo")

# Global MongoDB client (created once on startup, reused for all requests)
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """
    Connect to MongoDB on application startup.
    Called automatically by FastAPI's startup event.
    Creates indexes for fast queries.

    NOTE: If MongoDB is not running, the app starts in degraded mode.
    All database operations will return empty results or raise graceful errors.
    To fix: set MONGODB_URL in .env to a running MongoDB instance or Atlas URL.
    """
    global _client, _db

    log.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    try:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,  # Fail fast (5 seconds not 30)
        )
        _db = _client[settings.MONGODB_DB]

        # Test the connection by pinging the server
        await _client.admin.command("ping")
        log.info(f"✅ MongoDB connected — database: '{settings.MONGODB_DB}'")

        # Create indexes for fast lookups
        await _create_indexes()

    except Exception as e:
        log.warning(
            f"⚠️  MongoDB not available: {e}\n"
            f"    App starting in DEGRADED mode — database features disabled.\n"
            f"    To fix: start MongoDB locally or set MONGODB_URL to an Atlas connection string.\n"
            f"    Free Atlas: https://www.mongodb.com/cloud/atlas"
        )
        # Don't crash — let the app start without a database
        _client = None
        _db = None


async def disconnect_db() -> None:
    """
    Disconnect from MongoDB on application shutdown.
    Always called automatically by FastAPI's shutdown event.
    """
    global _client
    if _client:
        _client.close()
        log.info("MongoDB disconnected")


async def get_db() -> AsyncIOMotorDatabase:
    """
    Get the database instance.
    Raises HTTP-friendly error if MongoDB is not connected.
    """
    if _db is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail=(
                "Database not connected. "
                "Start MongoDB locally (mongod) or set MONGODB_URL to a MongoDB Atlas connection string in backend/.env. "
                "Free Atlas: https://www.mongodb.com/cloud/atlas"
            ),
        )
    return _db


async def _create_indexes() -> None:
    """
    Create database indexes for commonly queried fields.
    Indexes speed up queries — like the index at the back of a book.
    This is idempotent (safe to call multiple times).
    """
    db = await get_db()

    # Users: find by GitHub ID quickly
    await db.users.create_index("github_id", unique=True, sparse=True)
    await db.users.create_index("email", sparse=True)

    # Sessions: find by user ID, sorted by last updated
    await db.sessions.create_index([("user_id", 1), ("updated_at", -1)])
    await db.sessions.create_index("status")

    # Messages: find all messages in a session, in order
    await db.messages.create_index([("session_id", 1), ("created_at", 1)])

    # Repositories: find by owner/name
    await db.repositories.create_index("full_name")
    await db.repositories.create_index("user_id")

    log.info("✅ MongoDB indexes created")


# ── Collection Accessors ──────────────────────────────────────────────────────
# Convenience functions to get typed collection references.
# These are used throughout the routes and agents.

async def users_col():
    db = await get_db()
    return db.users

async def sessions_col():
    db = await get_db()
    return db.sessions

async def messages_col():
    db = await get_db()
    return db.messages

async def repositories_col():
    db = await get_db()
    return db.repositories

async def agents_col():
    db = await get_db()
    return db.agents

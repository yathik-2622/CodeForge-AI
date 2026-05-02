import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from app.config import settings

log = logging.getLogger("codeforge.db.mongo")

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    log.info(f"Connecting to MongoDB...")
    try:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
            socketTimeoutMS=20000,
            maxPoolSize=50,
            minPoolSize=5,
            retryWrites=True,
            retryReads=True,
        )
        _db = _client[settings.MONGODB_DB]
        await _client.admin.command("ping")
        log.info(f"✅ MongoDB connected — db: '{settings.MONGODB_DB}'")
        await _create_indexes()
    except Exception as e:
        log.warning(f"⚠️  MongoDB unavailable: {e}\n    Running in degraded mode.")
        _client = None
        _db = None


async def disconnect_db() -> None:
    global _client
    if _client:
        _client.close()
        log.info("MongoDB disconnected")


async def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Database not connected. Set MONGODB_URL in backend/.env to a valid MongoDB Atlas connection string.",
        )
    return _db


def is_connected() -> bool:
    return _db is not None


async def _create_indexes() -> None:
    db = await get_db()
    # Users
    await db.users.create_index("github_id", unique=True, sparse=True)
    await db.users.create_index("email", sparse=True)
    await db.users.create_index([("login", ASCENDING)])
    # Sessions
    await db.sessions.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await db.sessions.create_index("status")
    await db.sessions.create_index("created_at")
    # Messages
    await db.messages.create_index([("session_id", ASCENDING), ("created_at", ASCENDING)])
    await db.messages.create_index("role")
    # Repositories
    await db.repositories.create_index("full_name")
    await db.repositories.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await db.repositories.create_index("status")
    log.info("✅ MongoDB indexes created/verified")


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

import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from app.config import settings

log = logging.getLogger("codeforge.db.mongo")

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def _patch_dns_resolver() -> None:
    """Force dnspython (used by motor for mongodb+srv://) to use Google DNS.
    This bypasses corporate/home router DNS that can't resolve MongoDB Atlas SRV records."""
    try:
        import dns.resolver
        resolver = dns.resolver.Resolver(configure=False)
        resolver.nameservers = ["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]
        resolver.timeout  = 10
        resolver.lifetime = 20
        dns.resolver.default_resolver = resolver
        log.info("DNS resolver patched → Google/Cloudflare DNS (fixes Atlas SRV lookups)")
    except Exception as e:
        log.warning(f"Could not patch DNS resolver: {e} — will use system DNS")


async def connect_db() -> None:
    global _client, _db
    _patch_dns_resolver()
    log.info("Connecting to MongoDB Atlas...")
    try:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            tls=True,
            retryWrites=True,
            retryReads=True,
            maxPoolSize=50,
            minPoolSize=2,
        )
        _db = _client[settings.MONGODB_DB]
        await asyncio.wait_for(_client.admin.command("ping"), timeout=30)
        log.info(f"✅ MongoDB Atlas connected — db: '{settings.MONGODB_DB}'")
        await _create_indexes()
    except asyncio.TimeoutError:
        log.warning(
            "⚠️  MongoDB Atlas ping timed out.\n"
            "    Check:\n"
            "      1. MONGODB_URL in backend/.env is correct (mongodb+srv://...)\n"
            "      2. Your IP is whitelisted in Atlas Network Access\n"
            "      3. Atlas cluster is not paused\n"
            "    Running in degraded mode."
        )
        _client = None
        _db = None
    except Exception as e:
        log.warning(
            f"⚠️  MongoDB unavailable: {e}\n"
            "    Ensure MONGODB_URL is set to your Atlas connection string.\n"
            "    Running in degraded mode."
        )
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
            detail=(
                "MongoDB not connected. "
                "Set MONGODB_URL to your Atlas URI in backend/.env "
                "and whitelist your IP in Atlas Network Access."
            ),
        )
    return _db


def is_connected() -> bool:
    return _db is not None


async def _create_indexes() -> None:
    db = await get_db()
    await db.users.create_index("github_id", unique=True, sparse=True)
    await db.users.create_index("email", sparse=True)
    await db.users.create_index([("login", ASCENDING)])
    await db.sessions.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await db.sessions.create_index("status")
    await db.sessions.create_index("created_at")
    await db.messages.create_index([("session_id", ASCENDING), ("created_at", ASCENDING)])
    await db.messages.create_index("role")
    await db.repositories.create_index("full_name")
    await db.repositories.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    await db.repositories.create_index("status")
    log.info("✅ MongoDB indexes created/verified")


async def users_col():
    db = await get_db(); return db.users

async def sessions_col():
    db = await get_db(); return db.sessions

async def messages_col():
    db = await get_db(); return db.messages

async def repositories_col():
    db = await get_db(); return db.repositories

async def agents_col():
    db = await get_db(); return db.agents

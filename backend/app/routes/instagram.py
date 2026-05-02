"""
=============================================================================
CodeForge AI — Instagram Integration (Twilio)
=============================================================================

Enables users to control CodeForge AI through Instagram Direct Messages.
Works the same way as WhatsApp — Twilio receives the Instagram message
and calls our webhook.

Setup (requires Instagram Business/Creator account):
    1. Connect Instagram to Twilio:
       Twilio Console → Messaging → Channels → Instagram
    2. Follow Twilio's Instagram setup guide
    3. Set webhook URL: https://your-app.com/api/instagram/webhook
    4. Add env var: TWILIO_INSTAGRAM_FROM=instagram:your-page-id

Note: Instagram integration requires an Instagram Business account and
      must be reviewed by Meta before going live. Use the Twilio sandbox
      for testing.

Instagram Twilio docs: https://www.twilio.com/docs/messaging/channels/instagram

=============================================================================
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Form
from fastapi.responses import Response
import httpx
from bson import ObjectId
from app.config import settings
from app.db.mongo import sessions_col, messages_col
from app.agents.graph import run_agent_graph

log = logging.getLogger("codeforge.routes.instagram")
router = APIRouter(prefix="/api/instagram", tags=["instagram"])

MAX_IG_LENGTH = 1000  # Instagram has a 1000 char DM limit


def is_configured() -> bool:
    """Check if Twilio Instagram credentials are set."""
    return bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_INSTAGRAM_FROM)


async def send_instagram_dm(to: str, body: str) -> None:
    """
    Send an Instagram Direct Message via Twilio.

    Args:
        to:   Instagram user ID in Twilio format (e.g., "instagram:123456789")
        body: Message text to send (max 1000 chars)
    """
    if not is_configured():
        log.warning("Instagram not configured — cannot send message")
        return

    # Instagram has a 1000 char limit — truncate if needed
    if len(body) > MAX_IG_LENGTH:
        body = body[:MAX_IG_LENGTH - 3] + "..."

    auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            auth=auth,
            data={"From": settings.TWILIO_INSTAGRAM_FROM, "To": to, "Body": body},
        )
        if resp.status_code >= 400:
            log.error(f"Instagram DM send failed: {resp.status_code} {resp.text[:200]}")
        else:
            log.info(f"Instagram DM sent to {to}")


async def get_or_create_ig_session(instagram_id: str) -> tuple[str, bool]:
    """
    Get or create a session for an Instagram user.
    Same logic as WhatsApp — sessions expire after 7 days of inactivity.
    """
    col = await sessions_col()
    title = f"Instagram: {instagram_id}"

    existing = await col.find_one(
        {"title": title},
        sort=[("updated_at", -1)]
    )

    if existing:
        days_old = (datetime.utcnow() - existing["updated_at"]).days
        if days_old < 7:
            return str(existing["_id"]), False

    now = datetime.utcnow()
    result = await col.insert_one({
        "title": title,
        "model": settings.DEFAULT_MODEL,
        "status": "active",
        "message_count": 0,
        "platform": "instagram",
        "created_at": now,
        "updated_at": now,
    })
    log.info(f"Created new Instagram session for {instagram_id}: {result.inserted_id}")
    return str(result.inserted_id), True


async def handle_ig_command(from_id: str, text: str) -> bool:
    """Handle Instagram slash commands. Returns True if handled."""
    lower = text.lower().strip()

    if lower in ["/start", "hi", "hello", "hey", "start"]:
        await send_instagram_dm(from_id,
            "⚡ CodeForge AI — Your coding agent on Instagram!\n\n"
            "Ask me to:\n"
            "• Write or fix code\n"
            "• Explain programming concepts\n"
            "• Search web for docs\n"
            "• Debug errors\n\n"
            "Type /help for all commands"
        )
        return True

    if lower == "/help":
        await send_instagram_dm(from_id,
            "CodeForge AI Commands:\n"
            "/new — Fresh conversation\n"
            "/help — This menu\n\n"
            "Or ask any coding question!"
        )
        return True

    if lower == "/new":
        col = await sessions_col()
        now = datetime.utcnow()
        await col.insert_one({
            "title": f"Instagram: {from_id}",
            "model": settings.DEFAULT_MODEL,
            "status": "active",
            "message_count": 0,
            "platform": "instagram",
            "created_at": now,
            "updated_at": now,
        })
        await send_instagram_dm(from_id, "✅ New session! Ask your first question.")
        return True

    return False


@router.post("/webhook")
async def instagram_webhook(
    From: str = Form(default=""),
    Body: str = Form(default=""),
):
    """
    Twilio calls this when an Instagram DM is received.
    Same pattern as WhatsApp — respond to Twilio immediately with empty TwiML,
    then process the message.
    """
    empty_twiml = "<?xml version='1.0' encoding='UTF-8'?><Response></Response>"

    if not From or not Body:
        return Response(content=empty_twiml, media_type="text/xml")

    log.info(f"Instagram DM from {From}: '{Body[:50]}'")

    try:
        session_id, is_new = await get_or_create_ig_session(From)

        if is_new or await handle_ig_command(From, Body):
            return Response(content=empty_twiml, media_type="text/xml")

        # Save user message
        col = await messages_col()
        sessions = await sessions_col()

        await col.insert_one({
            "session_id": ObjectId(session_id),
            "role": "user",
            "content": Body,
            "platform": "instagram",
            "created_at": datetime.utcnow(),
        })

        # Load history and generate response
        cursor = col.find({"session_id": ObjectId(session_id)}).sort("created_at", 1).limit(10)
        history_docs = await cursor.to_list(length=10)
        history = [{"role": m["role"], "content": m["content"]} for m in history_docs[:-1]]

        ai_response = await run_agent_graph(Body, history)

        # Save AI response
        await col.insert_one({
            "session_id": ObjectId(session_id),
            "role": "agent",
            "content": ai_response,
            "agent_type": "coding",
            "platform": "instagram",
            "created_at": datetime.utcnow(),
        })

        await sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"status": "idle", "updated_at": datetime.utcnow()}},
        )

        # Send response via Instagram DM
        await send_instagram_dm(From, ai_response)

    except Exception as e:
        log.error(f"Instagram processing error: {e}", exc_info=True)
        await send_instagram_dm(From, "Error processing your message. Please try again.")

    return Response(content=empty_twiml, media_type="text/xml")


@router.get("/status")
async def instagram_status():
    """Check Instagram integration status and show setup instructions."""
    webhook_url = f"{settings.APP_URL}/api/instagram/webhook"
    return {
        "configured": is_configured(),
        "webhook_url": webhook_url,
        "from_account": settings.TWILIO_INSTAGRAM_FROM or "not set",
        "instructions": (
            "Instagram integration is active ✅"
            if is_configured()
            else [
                "1. You need an Instagram Business or Creator account",
                "2. Connect it to a Facebook Page",
                "3. In Twilio Console → Messaging → Channels → Instagram",
                "4. Follow Twilio's Instagram setup wizard",
                f"5. Set webhook URL to: {webhook_url}",
                "6. Add env var: TWILIO_INSTAGRAM_FROM=instagram:your-page-id",
                "7. Restart the server",
            ]
        ),
    }

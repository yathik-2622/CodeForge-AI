"""
=============================================================================
CodeForge AI — WhatsApp Integration (Twilio)
=============================================================================

When a user sends a WhatsApp message to your Twilio number,
Twilio calls this webhook with the message content.
We process it with the AI and send the response back via Twilio's API.

Setup:
    1. Create free Twilio account at https://twilio.com
    2. Enable WhatsApp Sandbox: Console → Messaging → Try it out
    3. Set webhook URL: https://your-app.com/api/whatsapp/webhook
    4. Add env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM

Commands users can send:
    /start or hi  → Welcome message
    /new          → Start fresh session
    /help         → Show all commands
    /history      → See last few messages
    Any other text → AI responds

=============================================================================
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Request, Form
from fastapi.responses import Response
import httpx
from bson import ObjectId
from app.config import settings
from app.db.mongo import sessions_col, messages_col
from app.agents.graph import run_agent_graph

log = logging.getLogger("codeforge.routes.whatsapp")
router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

# Maximum WhatsApp message length (split longer responses)
MAX_WA_LENGTH = 1500


def is_configured() -> bool:
    """Check if Twilio WhatsApp credentials are set."""
    return bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_WHATSAPP_FROM)


async def send_whatsapp_message(to: str, body: str) -> None:
    """
    Send a WhatsApp message via Twilio REST API.
    Automatically splits messages that exceed WhatsApp's length limit.

    Args:
        to:   Recipient WhatsApp number (e.g., "whatsapp:+1234567890")
        body: Message text to send
    """
    if not is_configured():
        log.warning("WhatsApp not configured — cannot send message")
        return

    # Split long messages into chunks
    chunks = [body[i:i + MAX_WA_LENGTH] for i in range(0, len(body), MAX_WA_LENGTH)]

    auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

    async with httpx.AsyncClient() as client:
        for i, chunk in enumerate(chunks):
            suffix = f" [{i+1}/{len(chunks)}]" if len(chunks) > 1 else ""
            resp = await client.post(
                url,
                auth=auth,
                data={"From": settings.TWILIO_WHATSAPP_FROM, "To": to, "Body": chunk + suffix},
            )
            if resp.status_code >= 400:
                log.error(f"Twilio send failed: {resp.status_code} {resp.text[:200]}")


async def get_or_create_session(phone: str) -> tuple[str, bool]:
    """
    Get the existing WhatsApp session for a phone number,
    or create a new one if none exists (or if last one is > 7 days old).

    Returns: (session_id_string, is_new_session)
    """
    col = await sessions_col()
    title = f"WhatsApp: {phone}"

    # Find the most recent session for this phone number
    existing = await col.find_one(
        {"title": title},
        sort=[("updated_at", -1)]
    )

    if existing:
        # Reuse if less than 7 days old
        days_old = (datetime.utcnow() - existing["updated_at"]).days
        if days_old < 7:
            return str(existing["_id"]), False

    # Create a new session
    now = datetime.utcnow()
    result = await col.insert_one({
        "title": title,
        "model": settings.DEFAULT_MODEL,
        "status": "active",
        "message_count": 0,
        "created_at": now,
        "updated_at": now,
    })
    log.info(f"Created new WhatsApp session for {phone}: {result.inserted_id}")
    return str(result.inserted_id), True


async def handle_command(from_number: str, text: str, session_id: str) -> bool:
    """
    Handle WhatsApp slash commands.
    Returns True if a command was handled, False for regular messages.
    """
    lower = text.lower().strip()

    if lower in ["/start", "start", "hi", "hello", "hey"]:
        await send_whatsapp_message(from_number,
            "⚡ *CodeForge AI* — Your autonomous coding agent\n\n"
            "I can help you:\n"
            "• Write and fix code in any language\n"
            "• Search the web for documentation\n"
            "• Explain programming concepts\n"
            "• Debug errors and stack traces\n\n"
            "Just send me your coding question!\n\n"
            "Commands:\n"
            "/new — Start a fresh conversation\n"
            "/history — See recent messages\n"
            "/help — Show this menu"
        )
        return True

    if lower == "/help":
        await send_whatsapp_message(from_number,
            "⚡ *CodeForge AI Commands*\n\n"
            "/new — Start fresh conversation\n"
            "/history — Last 3 messages\n"
            "/help — Show this menu\n\n"
            "Or just ask anything:\n"
            "\"Fix this Python error: ...\"\n"
            "\"How do I use async/await?\"\n"
            "\"Search for React best practices\""
        )
        return True

    if lower == "/new":
        col = await sessions_col()
        now = datetime.utcnow()
        await col.insert_one({
            "title": f"WhatsApp: {from_number}",
            "model": settings.DEFAULT_MODEL,
            "status": "active",
            "message_count": 0,
            "created_at": now,
            "updated_at": now,
        })
        await send_whatsapp_message(from_number, "✅ New session started! What would you like to build?")
        return True

    if lower == "/history":
        col = await messages_col()
        cursor = col.find(
            {"session_id": ObjectId(session_id)}
        ).sort("created_at", -1).limit(6)
        msgs = await cursor.to_list(length=6)
        if not msgs:
            await send_whatsapp_message(from_number, "No history yet. Ask your first question!")
        else:
            history_text = "\n\n".join([
                f"{'You' if m['role'] == 'user' else '🤖 AI'}: {m['content'][:120]}..."
                for m in reversed(msgs)
            ])
            await send_whatsapp_message(from_number, f"📋 *Recent History*\n\n{history_text}")
        return True

    return False


@router.post("/webhook")
async def whatsapp_webhook(
    From: str = Form(default=""),
    Body: str = Form(default=""),
):
    """
    Twilio calls this endpoint when a WhatsApp message is received.

    Twilio sends form-encoded data with:
        From: "whatsapp:+1234567890"
        Body: "The user's message text"
        (and many other fields we don't need)

    We respond immediately with an empty TwiML response (required by Twilio),
    then process the message asynchronously.
    """
    if not From or not Body:
        return Response(
            content="<?xml version='1.0' encoding='UTF-8'?><Response></Response>",
            media_type="text/xml"
        )

    log.info(f"WhatsApp message from {From}: '{Body[:50]}...'")

    # Respond to Twilio immediately (must respond within 15 seconds)
    # We process the actual AI response asynchronously below
    empty_twiml = "<?xml version='1.0' encoding='UTF-8'?><Response></Response>"

    # Process message (do this after returning to Twilio)
    try:
        session_id, is_new = await get_or_create_session(From)

        # Handle greeting for new sessions
        if is_new:
            await handle_command(From, "start", session_id)
            if Body.strip().lower() in ["hi", "hello", "hey", "start", "/start"]:
                return Response(content=empty_twiml, media_type="text/xml")

        # Handle slash commands
        if await handle_command(From, Body, session_id):
            return Response(content=empty_twiml, media_type="text/xml")

        # Regular message — save and process with AI
        col = await messages_col()
        sessions = await sessions_col()

        await col.insert_one({
            "session_id": ObjectId(session_id),
            "role": "user",
            "content": Body,
            "created_at": datetime.utcnow(),
        })

        # Load conversation history
        cursor = col.find({"session_id": ObjectId(session_id)}).sort("created_at", 1).limit(15)
        history_docs = await cursor.to_list(length=15)
        history = [{"role": m["role"], "content": m["content"]} for m in history_docs[:-1]]

        # Generate AI response (non-streaming for WhatsApp)
        ai_response = await run_agent_graph(Body, history, model=settings.DEFAULT_MODEL)

        # Save AI response
        await col.insert_one({
            "session_id": ObjectId(session_id),
            "role": "agent",
            "content": ai_response,
            "agent_type": "coding",
            "created_at": datetime.utcnow(),
        })

        await sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"status": "idle", "updated_at": datetime.utcnow()}},
        )

        # Send AI response back via WhatsApp
        # Remove markdown that WhatsApp doesn't support well
        clean_response = ai_response.replace("**", "*")
        await send_whatsapp_message(From, clean_response)

    except Exception as e:
        log.error(f"WhatsApp processing error: {e}", exc_info=True)
        await send_whatsapp_message(From, "Sorry, I encountered an error. Please try again.")

    return Response(content=empty_twiml, media_type="text/xml")


@router.get("/status")
async def whatsapp_status():
    """Check WhatsApp integration status and show setup instructions."""
    webhook_url = f"{settings.APP_URL}/api/whatsapp/webhook"
    return {
        "configured": is_configured(),
        "webhook_url": webhook_url,
        "from_number": settings.TWILIO_WHATSAPP_FROM or "not set",
        "instructions": (
            "WhatsApp is active ✅"
            if is_configured()
            else [
                "1. Create free Twilio account at https://twilio.com",
                "2. Enable WhatsApp Sandbox: Console → Messaging → Try it out",
                f"3. Set webhook URL to: {webhook_url}",
                "4. Add env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM",
                "5. Restart the server",
            ]
        ),
    }

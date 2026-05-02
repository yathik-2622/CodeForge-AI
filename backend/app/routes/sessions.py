"""
=============================================================================
CodeForge AI — Chat Sessions & AI Streaming Routes
=============================================================================

These routes handle the core AI chat functionality:

    POST   /api/sessions               → Create a new chat session
    GET    /api/sessions               → List all sessions
    GET    /api/sessions/{id}          → Get a single session
    POST   /api/sessions/{id}/messages → Send a user message
    POST   /api/sessions/{id}/stream   → Stream the AI response (SSE)
    GET    /api/sessions/{id}/messages → Get all messages in a session
    GET    /api/sessions/{id}/ws       → WebSocket for real-time collaboration

SSE (Server-Sent Events) is how AI responses stream token by token.
The frontend reads this stream and displays each token as it arrives —
giving the "typing" effect you see in ChatGPT.

=============================================================================
"""

import logging
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from bson import ObjectId
from app.db.mongo import sessions_col, messages_col
from app.agents.graph import stream_agent_graph
from app.lib.websocket import ws_manager
from app.middleware.auth import get_current_user_optional
from app.models.session import (
    CreateSessionRequest, SendMessageRequest,
    SessionResponse, MessageResponse
)

log = logging.getLogger("codeforge.routes.sessions")
router = APIRouter(prefix="/api/sessions", tags=["sessions"])


# ── Helper: ObjectId serialization ────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    """Convert MongoDB ObjectId fields to strings for JSON serialization."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# ── POST /api/sessions — Create a new session ─────────────────────────────────

@router.post("", status_code=201)
async def create_session(
    body: CreateSessionRequest,
    user: dict | None = Depends(get_current_user_optional),
):
    """
    Create a new AI chat session.
    Like opening a new conversation in ChatGPT.
    """
    log.info(f"Creating session: title='{body.title}', model='{body.model}'")
    col = await sessions_col()
    now = datetime.utcnow()

    session_doc = {
        "title": body.title,
        "model": body.model,
        "status": "idle",
        "message_count": 0,
        "repository_id": ObjectId(body.repository_id) if body.repository_id else None,
        "user_id": ObjectId(str(user["_id"])) if user else None,
        "created_at": now,
        "updated_at": now,
    }

    result = await col.insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    log.info(f"Session created: id={result.inserted_id}")
    return SessionResponse.from_mongo(session_doc)


# ── GET /api/sessions — List sessions ─────────────────────────────────────────

@router.get("")
async def list_sessions(user: dict | None = Depends(get_current_user_optional)):
    """List all chat sessions, sorted newest first."""
    col = await sessions_col()

    # If logged in, show user's sessions; otherwise show all (demo mode)
    query = {"user_id": ObjectId(str(user["_id"]))} if user else {}

    cursor = col.find(query).sort("updated_at", -1).limit(50)
    sessions = await cursor.to_list(length=50)
    return [SessionResponse.from_mongo(s) for s in sessions]


# ── GET /api/sessions/{id} — Get a single session ─────────────────────────────

@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get a single session by its ID."""
    col = await sessions_col()
    try:
        session = await col.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse.from_mongo(session)


# ── GET /api/sessions/{id}/messages — Get messages ────────────────────────────

@router.get("/{session_id}/messages")
async def list_messages(session_id: str):
    """Get all messages in a session, in chronological order."""
    col = await messages_col()
    try:
        cursor = col.find(
            {"session_id": ObjectId(session_id)}
        ).sort("created_at", 1)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    messages = await cursor.to_list(length=200)
    return [MessageResponse.from_mongo(m) for m in messages]


# ── POST /api/sessions/{id}/messages — Send a message ────────────────────────

@router.post("/{session_id}/messages", status_code=201)
async def send_message(session_id: str, body: SendMessageRequest):
    """
    Save a user's message to the database.
    Call this BEFORE the /stream endpoint to record what the user said.
    """
    log.info(f"Saving user message to session {session_id}")
    col = await messages_col()
    sessions = await sessions_col()

    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    # Save the user's message
    now = datetime.utcnow()
    msg_doc = {
        "session_id": oid,
        "role": "user",
        "content": body.content,
        "agent_type": None,
        "metadata": None,
        "created_at": now,
    }
    result = await col.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id

    # Update session status to "active" and bump updated_at
    await sessions.update_one(
        {"_id": oid},
        {"$set": {"status": "active", "updated_at": now}},
    )

    # Broadcast new message to WebSocket collaborators
    await ws_manager.broadcast_to_session(session_id, {
        "type": "message_sent",
        "message": MessageResponse.from_mongo(msg_doc).model_dump(mode="json"),
    })

    return MessageResponse.from_mongo(msg_doc)


# ── POST /api/sessions/{id}/stream — Stream AI response (SSE) ────────────────

@router.post("/{session_id}/stream")
async def stream_response(session_id: str):
    """
    Stream the AI's response using Server-Sent Events (SSE).

    SSE is a one-way connection from server to browser.
    The browser opens this connection and waits.
    The server sends tokens one by one as the AI generates them.
    The browser shows each token immediately — creating the "typing" effect.

    SSE message format:
        event: token
        data: {"token": "Hello"}

        event: done
        data: {"message_id": "abc123"}
    """
    log.info(f"Starting SSE stream for session {session_id}")

    # Load session and message history from MongoDB
    sessions = await sessions_col()
    messages_db = await messages_col()

    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = await sessions.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Load conversation history for context
    cursor = messages_db.find(
        {"session_id": oid}
    ).sort("created_at", 1).limit(20)
    history_docs = await cursor.to_list(length=20)

    if not history_docs:
        raise HTTPException(status_code=400, detail="No messages to respond to")

    # Get the latest user message
    user_messages = [m for m in history_docs if m["role"] == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message found")

    last_user_message = user_messages[-1]["content"]

    # Build history list for the agent (exclude the last message — it's the query)
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in history_docs[:-1]
    ]

    async def event_generator():
        """
        AsyncGenerator that yields SSE-formatted events.
        Called by StreamingResponse to send data to the browser.
        """
        full_response = ""

        # Signal the start of streaming to WebSocket collaborators
        await ws_manager.broadcast_to_session(session_id, {"type": "stream_start"})

        try:
            # Stream tokens from the LangGraph agent
            async for token in stream_agent_graph(
                user_message=last_user_message,
                history=history,
                model=session.get("model"),
            ):
                full_response += token
                # Send each token as an SSE event
                yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
                # Also broadcast to WebSocket collaborators
                await ws_manager.broadcast_to_session(session_id, {"type": "token", "token": token})

        except Exception as e:
            log.error(f"Streaming error in session {session_id}: {e}")
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
            await ws_manager.broadcast_to_session(session_id, {"type": "stream_end"})
            return

        # Save the complete AI response to MongoDB
        now = datetime.utcnow()
        msg_doc = {
            "session_id": oid,
            "role": "agent",
            "content": full_response,
            "agent_type": "coding",
            "metadata": {
                "model": session.get("model"),
                "char_count": len(full_response),
            },
            "created_at": now,
        }
        msg_result = await messages_db.insert_one(msg_doc)
        msg_doc["_id"] = msg_result.inserted_id

        # Update session stats
        msg_count = await messages_db.count_documents({"session_id": oid})
        await sessions.update_one(
            {"_id": oid},
            {"$set": {"status": "idle", "message_count": msg_count, "updated_at": now}},
        )

        # Notify WebSocket collaborators that streaming is done
        msg_response = MessageResponse.from_mongo(msg_doc)
        await ws_manager.broadcast_to_session(session_id, {
            "type": "stream_end",
            "message": msg_response.model_dump(mode="json"),
        })

        # Send SSE done event with the saved message ID
        yield f"event: done\ndata: {json.dumps({'message_id': str(msg_result.inserted_id)})}\n\n"
        log.info(f"✅ Streaming complete for session {session_id} ({len(full_response)} chars)")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",        # Disable caching for real-time data
            "X-Accel-Buffering": "no",          # Disable Nginx buffering
            "Connection": "keep-alive",
        },
    )


# ── GET /api/sessions/{id}/ws — WebSocket for real-time collaboration ─────────

@router.websocket("/{session_id}/ws")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time collaborative sessions.

    When multiple users open the same session URL, they all connect here.
    The server broadcasts:
    - When AI streams tokens (all users see them simultaneously)
    - When a participant joins or leaves
    - When a new message is sent

    Protocol messages sent to clients:
        {"type": "joined", "participant": {...}, "participants": [...]}
        {"type": "participant_joined", "participant": {...}}
        {"type": "participant_left", "participant_id": "..."}
        {"type": "token", "token": "Hello"}
        {"type": "stream_start"}
        {"type": "stream_end", "message": {...}}
    """
    log.info(f"WebSocket connecting to session {session_id}")
    participant = await ws_manager.connect(websocket, session_id)

    try:
        # Keep the connection alive, handling pings
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        log.info(f"WebSocket disconnected: {participant.name} from session {session_id}")
    finally:
        await ws_manager.disconnect(participant.id, session_id)

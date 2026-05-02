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
    SessionResponse, MessageResponse,
)

log = logging.getLogger("codeforge.routes.sessions")
router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _oid(val: str) -> ObjectId:
    try:
        return ObjectId(val)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid ID format: {val}")


# ── POST /api/sessions ────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_session(
    body: CreateSessionRequest,
    user: dict | None = Depends(get_current_user_optional),
):
    col = await sessions_col()
    now = datetime.utcnow()
    doc = {
        "title": body.title,
        "model": body.model or "mistralai/mistral-7b-instruct:free",
        "status": "idle",
        "message_count": 0,
        "repository_id": _oid(body.repository_id) if body.repository_id else None,
        "user_id": user["_id"] if user else None,
        "created_at": now,
        "updated_at": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    log.info(f"Session created: {result.inserted_id} title='{body.title}'")
    return SessionResponse.from_mongo(doc)


# ── GET /api/sessions ─────────────────────────────────────────────────────────

@router.get("")
async def list_sessions(user: dict | None = Depends(get_current_user_optional)):
    col = await sessions_col()
    query = {"user_id": user["_id"]} if user else {}
    cursor = col.find(query).sort("updated_at", -1).limit(50)
    docs = await cursor.to_list(length=50)
    return [SessionResponse.from_mongo(d) for d in docs]


# ── GET /api/sessions/{id} ────────────────────────────────────────────────────

@router.get("/{session_id}")
async def get_session(session_id: str):
    col = await sessions_col()
    doc = await col.find_one({"_id": _oid(session_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse.from_mongo(doc)


# ── GET /api/sessions/{id}/messages ──────────────────────────────────────────

@router.get("/{session_id}/messages")
async def list_messages(session_id: str):
    col = await messages_col()
    cursor = col.find({"session_id": _oid(session_id)}).sort("created_at", 1)
    docs = await cursor.to_list(length=500)
    return [MessageResponse.from_mongo(d) for d in docs]


# ── POST /api/sessions/{id}/messages ─────────────────────────────────────────

@router.post("/{session_id}/messages", status_code=201)
async def send_message(session_id: str, body: SendMessageRequest):
    msg_col = await messages_col()
    sess_col = await sessions_col()
    oid = _oid(session_id)
    now = datetime.utcnow()

    doc = {
        "session_id": oid,
        "role": "user",
        "content": body.content,
        "agent_type": None,
        "metadata": {},
        "created_at": now,
    }
    result = await msg_col.insert_one(doc)
    doc["_id"] = result.inserted_id

    await sess_col.update_one(
        {"_id": oid},
        {"$set": {"status": "active", "updated_at": now}},
    )

    await ws_manager.broadcast_to_session(session_id, {
        "type": "message_sent",
        "message": MessageResponse.from_mongo(doc).model_dump(mode="json"),
    })

    return MessageResponse.from_mongo(doc)


# ── POST /api/sessions/{id}/stream — SSE Streaming ───────────────────────────

@router.post("/{session_id}/stream")
async def stream_response(session_id: str):
    """
    Stream AI response using Server-Sent Events (SSE).

    Event types sent to the client:
        event: route     — which agent path was chosen (research/code/direct)
        event: search    — web search started or completed
        event: token     — a single AI token
        event: done      — streaming finished, includes saved message_id
        event: error     — something went wrong
    """
    sess_col = await sessions_col()
    msg_col = await messages_col()
    oid = _oid(session_id)

    session = await sess_col.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Load last 20 messages for context
    cursor = msg_col.find({"session_id": oid}).sort("created_at", 1).limit(20)
    history_docs = await cursor.to_list(length=20)

    user_msgs = [m for m in history_docs if m["role"] == "user"]
    if not user_msgs:
        raise HTTPException(status_code=400, detail="No user message to respond to")

    last_user_msg = user_msgs[-1]["content"]
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in history_docs[:-1]
    ]

    async def event_generator():
        full_response = ""
        await ws_manager.broadcast_to_session(session_id, {"type": "stream_start"})

        try:
            async for chunk in stream_agent_graph(
                user_message=last_user_msg,
                history=history,
                model=session.get("model"),
            ):
                if isinstance(chunk, dict):
                    # Structured event (route decision, search status, etc.)
                    event_type = chunk.get("event", "info")
                    payload = {k: v for k, v in chunk.items() if k != "event"}

                    if event_type == "route":
                        yield f"event: route\ndata: {json.dumps(payload)}\n\n"
                    elif event_type == "search_start":
                        yield f"event: search\ndata: {json.dumps({'status': 'searching'})}\n\n"
                        await ws_manager.broadcast_to_session(session_id, {"type": "search_start"})
                    elif event_type == "search_done":
                        yield f"event: search\ndata: {json.dumps({'status': 'done', **payload})}\n\n"
                        await ws_manager.broadcast_to_session(session_id, {"type": "search_done"})
                    elif event_type == "search_error":
                        yield f"event: search\ndata: {json.dumps({'status': 'error', **payload})}\n\n"
                else:
                    # Plain string token
                    token: str = chunk
                    full_response += token
                    yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
                    await ws_manager.broadcast_to_session(session_id, {"type": "token", "token": token})

        except Exception as e:
            log.error(f"Streaming error (session={session_id}): {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
            await ws_manager.broadcast_to_session(session_id, {"type": "stream_end"})
            return

        if not full_response.strip():
            full_response = "I was unable to generate a response. Please try again."

        # Persist the full AI response
        now = datetime.utcnow()
        ai_doc = {
            "session_id": oid,
            "role": "agent",
            "content": full_response,
            "agent_type": "coding",
            "metadata": {
                "model": session.get("model"),
                "char_count": len(full_response),
                "word_count": len(full_response.split()),
            },
            "created_at": now,
        }
        msg_result = await msg_col.insert_one(ai_doc)
        ai_doc["_id"] = msg_result.inserted_id

        msg_count = await msg_col.count_documents({"session_id": oid})
        await sess_col.update_one(
            {"_id": oid},
            {"$set": {"status": "idle", "message_count": msg_count, "updated_at": now}},
        )

        response_obj = MessageResponse.from_mongo(ai_doc)
        await ws_manager.broadcast_to_session(session_id, {
            "type": "stream_end",
            "message": response_obj.model_dump(mode="json"),
        })

        yield f"event: done\ndata: {json.dumps({'message_id': str(msg_result.inserted_id), 'char_count': len(full_response)})}\n\n"
        log.info(f"Stream complete: session={session_id} chars={len(full_response)}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ── DELETE /api/sessions/{id} ─────────────────────────────────────────────────

@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str):
    sess_col = await sessions_col()
    msg_col = await messages_col()
    oid = _oid(session_id)
    await msg_col.delete_many({"session_id": oid})
    result = await sess_col.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")


# ── PATCH /api/sessions/{id} ─────────────────────────────────────────────────

@router.patch("/{session_id}")
async def update_session(session_id: str, body: dict):
    col = await sessions_col()
    allowed = {"title", "model"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    updates["updated_at"] = datetime.utcnow()
    result = await col.find_one_and_update(
        {"_id": _oid(session_id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse.from_mongo(result)


# ── WebSocket /api/sessions/{id}/ws ──────────────────────────────────────────

@router.websocket("/{session_id}/ws")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    participant = await ws_manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.get("type") == "typing":
                await ws_manager.broadcast_to_others(session_id, participant.id, {
                    "type": "user_typing",
                    "participant": {"id": participant.id, "name": participant.name},
                })
    except WebSocketDisconnect:
        log.info(f"WS disconnected: {participant.name} from session {session_id}")
    finally:
        await ws_manager.disconnect(participant.id, session_id)

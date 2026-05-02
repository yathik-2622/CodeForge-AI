"""
=============================================================================
CodeForge AI — WebSocket Connection Manager
=============================================================================

Manages real-time WebSocket connections for collaborative AI sessions.
When multiple users open the same chat session, they all see messages
streaming in real time — like Google Docs for AI conversations.

How it works:
    1. User opens a chat session URL
    2. Frontend connects to WebSocket: /api/sessions/{id}/ws
    3. Server adds them to the "room" for that session
    4. When AI streams a token, it's broadcast to ALL users in the room
    5. Users see "X collaborators are in this session"

=============================================================================
"""

import logging
import random
from fastapi import WebSocket
from dataclasses import dataclass, field

log = logging.getLogger("codeforge.lib.websocket")

# Random names and colors for anonymous collaborators
NAMES = ["Pixel", "Atlas", "Nova", "Echo", "Sage", "Flux", "Zen", "Orbit", "Blaze", "Drift"]
COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"]


@dataclass
class Participant:
    """A single connected user in a collaborative session."""
    id: str              # Unique random ID for this connection
    name: str            # Random display name (e.g., "Pixel", "Atlas")
    color: str           # Random color for their avatar
    websocket: WebSocket # The WebSocket connection object


@dataclass
class Room:
    """A collection of participants watching the same chat session."""
    session_id: str
    participants: dict[str, Participant] = field(default_factory=dict)


class WebSocketManager:
    """
    Manages all WebSocket rooms across all chat sessions.
    One instance of this class handles all connections for the whole server.
    """

    def __init__(self):
        # Dict of session_id → Room (each room has multiple participants)
        self.rooms: dict[str, Room] = {}

    def _get_room(self, session_id: str) -> Room:
        """Get or create a room for a session."""
        if session_id not in self.rooms:
            self.rooms[session_id] = Room(session_id=session_id)
        return self.rooms[session_id]

    async def connect(self, websocket: WebSocket, session_id: str) -> Participant:
        """
        Accept a new WebSocket connection and add them to the session room.
        Sends them their identity and the list of current participants.

        Returns: The new Participant object
        """
        await websocket.accept()

        # Create a random identity for this collaborator
        participant = Participant(
            id=random.randbytes(4).hex(),
            name=random.choice(NAMES),
            color=random.choice(COLORS),
            websocket=websocket,
        )

        room = self._get_room(session_id)
        room.participants[participant.id] = participant
        log.info(f"WS connected: {participant.name} ({participant.id}) → session {session_id} [{len(room.participants)} total]")

        # Tell the new user who they are and who else is in the room
        await websocket.send_json({
            "type": "joined",
            "participant": {"id": participant.id, "name": participant.name, "color": participant.color},
            "participants": self._serialize_participants(room),
        })

        # Tell everyone else a new person joined
        await self.broadcast_to_others(session_id, participant.id, {
            "type": "participant_joined",
            "participant": {"id": participant.id, "name": participant.name, "color": participant.color},
            "participants": self._serialize_participants(room),
        })

        return participant

    async def disconnect(self, participant_id: str, session_id: str) -> None:
        """Remove a participant and notify the remaining participants."""
        room = self.rooms.get(session_id)
        if not room or participant_id not in room.participants:
            return

        del room.participants[participant_id]
        log.info(f"WS disconnected: {participant_id} from session {session_id}")

        # Clean up empty rooms
        if not room.participants:
            del self.rooms[session_id]
            return

        # Notify remaining participants
        await self.broadcast_to_session(session_id, {
            "type": "participant_left",
            "participant_id": participant_id,
            "participants": self._serialize_participants(room),
        })

    async def broadcast_to_session(self, session_id: str, data: dict) -> None:
        """Send a message to ALL participants in a session (including sender)."""
        room = self.rooms.get(session_id)
        if not room:
            return
        dead: list[str] = []
        for pid, participant in room.participants.items():
            try:
                await participant.websocket.send_json(data)
            except Exception:
                dead.append(pid)  # Mark disconnected clients for cleanup
        # Clean up dead connections
        for pid in dead:
            await self.disconnect(pid, session_id)

    async def broadcast_to_others(self, session_id: str, exclude_id: str, data: dict) -> None:
        """Send a message to all participants EXCEPT the one with exclude_id."""
        room = self.rooms.get(session_id)
        if not room:
            return
        for pid, participant in room.participants.items():
            if pid != exclude_id:
                try:
                    await participant.websocket.send_json(data)
                except Exception:
                    pass

    def _serialize_participants(self, room: Room) -> list[dict]:
        """Convert participants to a JSON-serializable list (no WebSocket objects)."""
        return [
            {"id": p.id, "name": p.name, "color": p.color}
            for p in room.participants.values()
        ]


# Global singleton — import this in routes and agents
ws_manager = WebSocketManager()

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./logger";

export type WsEventType =
  | "joined"
  | "participant_joined"
  | "participant_left"
  | "participants"
  | "token"
  | "stream_start"
  | "stream_end"
  | "message_sent"
  | "message_saved"
  | "error";

export interface WsParticipant {
  id: string;
  name: string;
  color: string;
}

interface RoomClient {
  ws: WebSocket;
  participant: WsParticipant;
  sessionId: string;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];
const NAMES = [
  "Pixel", "Atlas", "Nova", "Echo", "Sage",
  "Flux", "Zen", "Orbit", "Blaze", "Drift",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 9);
}

class SessionRoomManager {
  private rooms = new Map<string, Map<string, RoomClient>>();

  private getRoom(sessionId: string): Map<string, RoomClient> {
    let room = this.rooms.get(sessionId);
    if (!room) {
      room = new Map();
      this.rooms.set(sessionId, room);
    }
    return room;
  }

  join(sessionId: string, ws: WebSocket): WsParticipant {
    const room = this.getRoom(sessionId);
    const participant: WsParticipant = {
      id: randomId(),
      name: randomItem(NAMES),
      color: randomItem(COLORS),
    };
    const client: RoomClient = { ws, participant, sessionId };
    room.set(participant.id, client);

    // Tell the new joiner who they are + existing participants
    this.send(ws, {
      type: "joined",
      participant,
      participants: this.getParticipants(sessionId),
    });

    // Tell everyone else
    this.broadcastExcept(sessionId, participant.id, {
      type: "participant_joined",
      participant,
      participants: this.getParticipants(sessionId),
    });

    logger.info({ sessionId, participantId: participant.id, name: participant.name }, "WS participant joined");
    return participant;
  }

  leave(sessionId: string, participantId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    const client = room.get(participantId);
    if (!client) return;
    room.delete(participantId);
    if (room.size === 0) this.rooms.delete(sessionId);

    this.broadcastToSession(sessionId, {
      type: "participant_left",
      participantId,
      participants: this.getParticipants(sessionId),
    });
    logger.info({ sessionId, participantId }, "WS participant left");
  }

  getParticipants(sessionId: string): WsParticipant[] {
    const room = this.rooms.get(sessionId);
    if (!room) return [];
    return Array.from(room.values()).map((c) => c.participant);
  }

  broadcastToSession(sessionId: string, data: object): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    const payload = JSON.stringify(data);
    for (const client of room.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  broadcastExcept(sessionId: string, excludeId: string, data: object): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    const payload = JSON.stringify(data);
    for (const [id, client] of room.entries()) {
      if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  private send(ws: WebSocket, data: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

export const rooms = new SessionRoomManager();

export function attachWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = req.url ?? "";
    // Expected path: /api/sessions/:id/ws
    const match = url.match(/^\/api\/sessions\/(\d+)\/ws$/);
    if (!match) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, match[1]);
    });
  });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, sessionId: string) => {
    const participant = rooms.join(sessionId, ws);

    ws.on("close", () => {
      rooms.leave(sessionId, participant.id);
    });

    ws.on("error", (err) => {
      logger.error(err, "WebSocket error");
      rooms.leave(sessionId, participant.id);
    });

    // Heartbeat
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {}
    });
  });

  logger.info("WebSocket server attached");
  return wss;
}

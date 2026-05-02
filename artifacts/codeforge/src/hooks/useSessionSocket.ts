import { useEffect, useRef, useState, useCallback } from "react";

export interface Participant {
  id: string;
  name: string;
  color: string;
}

export interface SessionSocketState {
  connected: boolean;
  me: Participant | null;
  participants: Participant[];
  streamingToken: string;
  isRemoteStreaming: boolean;
}

type Handler = (data: SessionSocketState) => void;

function getWsUrl(sessionId: string): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const loc = window.location;
  const proto = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${loc.host}${base}/api/sessions/${sessionId}/ws`;
}

export function useSessionSocket(sessionId: string | undefined, onUpdate: Handler) {
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<SessionSocketState>({
    connected: false,
    me: null,
    participants: [],
    streamingToken: "",
    isRemoteStreaming: false,
  });
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emit = useCallback(() => {
    onUpdate({ ...stateRef.current });
  }, [onUpdate]);

  useEffect(() => {
    if (!sessionId) return;

    function connect() {
      const ws = new WebSocket(getWsUrl(sessionId!));
      wsRef.current = ws;

      ws.onopen = () => {
        stateRef.current.connected = true;
        emit();
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, 25000);
      };

      ws.onclose = () => {
        stateRef.current.connected = false;
        stateRef.current.participants = [];
        if (pingRef.current) clearInterval(pingRef.current);
        emit();
        // Reconnect after 3 s
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const s = stateRef.current;
          switch (msg.type) {
            case "joined":
              s.me = msg.participant;
              s.participants = msg.participants;
              break;
            case "participant_joined":
            case "participant_left":
            case "participants":
              s.participants = msg.participants;
              break;
            case "stream_start":
              s.isRemoteStreaming = true;
              s.streamingToken = "";
              break;
            case "token":
              s.streamingToken += msg.token;
              break;
            case "stream_end":
              s.isRemoteStreaming = false;
              s.streamingToken = "";
              break;
            case "pong":
              return;
          }
          emit();
        } catch {}
      };
    }

    connect();
    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null; // prevent reconnect loop on unmount
        ws.close();
      }
    };
  }, [sessionId, emit]);
}

import { getConfig } from "./config.js";

export interface Session {
  id: string;
  title: string;
  model: string;
  status: string;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

function getBaseUrl(): string {
  const { serverUrl } = getConfig();
  if (!serverUrl) throw new Error("No server configured. Run: codeforge config --server <url>");
  return serverUrl.replace(/\/$/, "");
}

function getHeaders(): Record<string, string> {
  const { authToken } = getConfig();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  return h;
}

export async function createSession(title: string, model?: string): Promise<Session> {
  const res = await fetch(`${getBaseUrl()}/api/sessions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ title, model: model ?? getConfig().model }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Session>;
}

export async function sendMessage(sessionId: string, content: string): Promise<Message> {
  const res = await fetch(`${getBaseUrl()}/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<Message>;
}

export async function streamResponse(
  sessionId: string,
  onToken: (t: string) => void,
  onDone: () => void,
): Promise<void> {
  const res = await fetch(`${getBaseUrl()}/api/sessions/${sessionId}/stream`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Stream error ${res.status}`);
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const d = JSON.parse(line.slice(6));
          if (d.token) onToken(d.token);
          if (d.messageId !== undefined) { onDone(); return; }
        } catch {}
      }
      if (line.startsWith("event: done") || line.startsWith("event: error")) {
        onDone(); return;
      }
    }
  }
  onDone();
}

export async function listSessions(): Promise<Session[]> {
  const res = await fetch(`${getBaseUrl()}/api/sessions`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<Session[]>;
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${getBaseUrl()}/api/sessions/${sessionId}/messages`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<Message[]>;
}

export async function searchWeb(query: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/search/web?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

export async function getRepos(): Promise<any[]> {
  const res = await fetch(`${getBaseUrl()}/api/repositories`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json() as Promise<any[]>;
}

export async function scanRepo(id: string): Promise<any> {
  const res = await fetch(`${getBaseUrl()}/api/repositories/${id}/scan`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/health`, { headers: getHeaders() });
    return res.ok;
  } catch {
    return false;
  }
}

import * as vscode from "vscode";

export interface Session {
  id: string;
  title: string;
  model: string;
  status: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  agentType?: string;
  createdAt: string;
}

export class CodeForgeClient {
  private serverUrl: string;
  private context: vscode.ExtensionContext;

  constructor(serverUrl: string, context: vscode.ExtensionContext) {
    this.serverUrl = serverUrl.replace(/\/$/, "");
    this.context = context;
  }

  get baseUrl() {
    return this.serverUrl;
  }

  async getSessions(): Promise<Session[]> {
    const res = await fetch(`${this.serverUrl}/api/sessions`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  }

  async createSession(title: string, model?: string): Promise<Session> {
    const cfg = vscode.workspace.getConfiguration("codeforge");
    const res = await fetch(`${this.serverUrl}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        model: model ?? cfg.get<string>("model", "mistralai/mistral-7b-instruct:free"),
      }),
    });
    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
    return res.json();
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    const res = await fetch(`${this.serverUrl}/api/sessions/${sessionId}/messages`);
    if (!res.ok) return [];
    return res.json();
  }

  async sendMessage(sessionId: string, content: string): Promise<Message> {
    const res = await fetch(`${this.serverUrl}/api/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
    return res.json();
  }

  async *streamResponse(sessionId: string): AsyncGenerator<{ type: string; token?: string; messageId?: string; plan?: string }, void> {
    const res = await fetch(`${this.serverUrl}/api/sessions/${sessionId}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok || !res.body) throw new Error(`Stream error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          const event = line.slice(7).trim();
          continue;
        }
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) yield { type: "token", token: data.token };
            else if (data.message_id || data.messageId) yield { type: "done", messageId: data.message_id ?? data.messageId };
            else if (data.plan) yield { type: "route", plan: data.plan };
          } catch {}
        }
      }
    }
  }

  get currentSessionId(): string | undefined {
    return this.context.workspaceState.get<string>("codeforge.currentSessionId");
  }

  async setCurrentSessionId(id: string): Promise<void> {
    await this.context.workspaceState.update("codeforge.currentSessionId", id);
  }
}

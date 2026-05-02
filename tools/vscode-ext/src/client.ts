import * as vscode from "vscode";

export class CodeForgeClient {
  constructor(private context: vscode.ExtensionContext) {}

  getServerUrl(): string {
    return (
      vscode.workspace.getConfiguration("codeforge").get<string>("serverUrl") ??
      "https://your-codeforge-app.replit.app"
    ).replace(/\/$/, "");
  }

  getModel(): string {
    return (
      vscode.workspace.getConfiguration("codeforge").get<string>("model") ??
      "mistralai/mistral-7b-instruct:free"
    );
  }

  async createSession(title: string): Promise<{ id: string } | null> {
    try {
      const r = await fetch(`${this.getServerUrl()}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, model: this.getModel() }),
      });
      if (!r.ok) return null;
      return r.json();
    } catch {
      return null;
    }
  }

  async sendMessage(sessionId: string, content: string): Promise<boolean> {
    try {
      const r = await fetch(`${this.getServerUrl()}/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  streamResponse(
    sessionId: string,
    onToken: (t: string) => void,
    onDone: () => void,
    onError: (e: string) => void
  ): () => void {
    const controller = new AbortController();
    const url = `${this.getServerUrl()}/api/sessions/${sessionId}/stream`;

    fetch(url, { method: "POST", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok || !res.body) { onError(`HTTP ${res.status}`); return; }
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
      })
      .catch((e) => { if (e.name !== "AbortError") onError(String(e)); });

    return () => controller.abort();
  }
}

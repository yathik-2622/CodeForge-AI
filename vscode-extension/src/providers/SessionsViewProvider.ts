import * as vscode from "vscode";
import { CodeForgeClient, Session } from "../client";
import { getNonce } from "../util";

export class SessionsViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly client: CodeForgeClient,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
    webviewView.webview.html = this._getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "ready":
          await this._loadSessions();
          break;
        case "openSession":
          await this.client.setCurrentSessionId(msg.sessionId);
          vscode.commands.executeCommand("codeforge.openChat");
          break;
        case "newSession":
          const title = await vscode.window.showInputBox({
            prompt: "Session name",
            placeHolder: "e.g., Refactor auth module",
          });
          if (title) {
            await this.client.createSession(title);
            await this._loadSessions();
          }
          break;
        case "refresh":
          await this._loadSessions();
          break;
      }
    });
  }

  private async _loadSessions() {
    try {
      const sessions = await this.client.getSessions();
      this._view?.webview.postMessage({ type: "sessions", sessions });
    } catch {
      this._view?.webview.postMessage({ type: "sessions", sessions: [] });
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: 12px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); display: flex; flex-direction: column; height: 100vh; }
    #toolbar { padding: 6px 8px; border-bottom: 1px solid var(--vscode-sideBar-border); display: flex; align-items: center; gap: 6px; }
    #toolbar span { flex: 1; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vscode-descriptionForeground); }
    button.tb-btn { background: none; border: none; cursor: pointer; color: var(--vscode-icon-foreground); padding: 3px 5px; border-radius: 3px; font-size: 12px; }
    button.tb-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
    #list { flex: 1; overflow-y: auto; padding: 4px; }
    .session-item { padding: 7px 8px; border-radius: 5px; cursor: pointer; border: 1px solid transparent; margin-bottom: 2px; }
    .session-item:hover { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-panel-border); }
    .session-title { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .session-meta { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 2px; display: flex; gap: 6px; }
    .status-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; flex-shrink: 0; margin-top: 3px; }
    .status-dot.idle { background: #4ade80; }
    .status-dot.active { background: #facc15; }
    .empty { text-align: center; padding: 20px 10px; color: var(--vscode-descriptionForeground); font-size: 11px; line-height: 1.6; }
  </style>
</head>
<body>
<div id="toolbar">
  <span>Sessions</span>
  <button class="tb-btn" id="new-btn" title="New session">＋</button>
  <button class="tb-btn" id="refresh-btn" title="Refresh">↻</button>
</div>
<div id="list"><div class="empty">Loading sessions...</div></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const list = document.getElementById('list');

  document.getElementById('new-btn').addEventListener('click', () => vscode.postMessage({ type: 'newSession' }));
  document.getElementById('refresh-btn').addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'sessions') {
      if (!msg.sessions || msg.sessions.length === 0) {
        list.innerHTML = '<div class="empty">No sessions yet.<br/>Create one to start chatting.</div>';
        return;
      }
      list.innerHTML = msg.sessions.map(s => \`
        <div class="session-item" onclick="open('\${s.id}')">
          <div style="display:flex;align-items:center;gap:5px">
            <div class="status-dot \${s.status === 'active' ? 'active' : 'idle'}"></div>
            <div class="session-title">\${escHtml(s.title)}</div>
          </div>
          <div class="session-meta">
            <span>\${s.messageCount} msgs</span>
            <span>\${new Date(s.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      \`).join('');
    }
  });

  function open(id) { vscode.postMessage({ type: 'openSession', sessionId: id }); }
  function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
  }
}

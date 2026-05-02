import * as vscode from "vscode";
import { CodeForgeClient } from "./client";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private sessionId?: string;
  private cancelStream?: () => void;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly client: CodeForgeClient
  ) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this._view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.getHtml(view.webview);

    view.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "send":
          await this.handleSend(msg.text);
          break;
        case "newSession":
          this.sessionId = undefined;
          this._view?.webview.postMessage({ type: "cleared" });
          break;
        case "ready":
          this._view?.webview.postMessage({
            type: "config",
            serverUrl: this.client.getServerUrl(),
            model: this.client.getModel(),
          });
          break;
      }
    });
  }

  async sendMessage(text: string) {
    await this.handleSend(text, true);
  }

  async newSession() {
    this.sessionId = undefined;
    this._view?.webview.postMessage({ type: "cleared" });
  }

  updateServerUrl(url: string) {
    this._view?.webview.postMessage({ type: "config", serverUrl: url, model: this.client.getModel() });
  }

  refresh() {
    if (this._view) {
      this._view.webview.html = this.getHtml(this._view.webview);
    }
  }

  private async handleSend(text: string, fromExternal = false) {
    if (!this.sessionId) {
      const session = await this.client.createSession("VS Code Session");
      if (!session) {
        this._view?.webview.postMessage({
          type: "error",
          text: `Cannot connect to CodeForge server at ${this.client.getServerUrl()}.\n\nRun: codeforge.setServer to configure the URL.`,
        });
        return;
      }
      this.sessionId = session.id;
    }

    if (fromExternal) {
      this._view?.webview.postMessage({ type: "userMessage", text });
    }

    const sent = await this.client.sendMessage(this.sessionId, text);
    if (!sent) {
      this._view?.webview.postMessage({ type: "error", text: "Failed to send message." });
      return;
    }

    this._view?.webview.postMessage({ type: "streamStart" });
    this.cancelStream?.();

    this.cancelStream = this.client.streamResponse(
      this.sessionId,
      (token) => this._view?.webview.postMessage({ type: "token", token }),
      () => this._view?.webview.postMessage({ type: "streamEnd" }),
      (err) => this._view?.webview.postMessage({ type: "error", text: err })
    );
  }

  private getHtml(webview: vscode.Webview): string {
    const serverUrl = this.client.getServerUrl();
    const model = this.client.getModel();
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
<title>CodeForge AI</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);background:var(--vscode-sideBar-background);display:flex;flex-direction:column;height:100vh;overflow:hidden}
  #header{padding:8px 12px;border-bottom:1px solid var(--vscode-sideBar-border);display:flex;align-items:center;gap:8px;flex-shrink:0}
  #header .logo{font-weight:700;font-size:13px;color:var(--vscode-textLink-foreground)}
  #header .model{font-size:10px;color:var(--vscode-descriptionForeground);margin-left:auto}
  #messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
  .msg{max-width:100%;word-wrap:break-word}
  .msg.user{background:var(--vscode-input-background);border:1px solid var(--vscode-input-border);border-radius:6px;padding:8px 10px;font-size:12px;margin-left:20px}
  .msg.assistant{font-size:12px;line-height:1.6}
  .msg.assistant pre{background:var(--vscode-textCodeBlock-background);border:1px solid var(--vscode-widget-border);border-radius:4px;padding:8px;overflow-x:auto;margin:4px 0;font-family:var(--vscode-editor-font-family);font-size:11px}
  .msg.assistant code{font-family:var(--vscode-editor-font-family);font-size:11px;background:var(--vscode-textCodeBlock-background);padding:1px 4px;border-radius:2px}
  .msg.error{color:var(--vscode-errorForeground);font-size:11px;padding:6px;background:var(--vscode-inputValidation-errorBackground);border-radius:4px}
  .cursor{display:inline-block;width:8px;height:14px;background:var(--vscode-textLink-foreground);animation:blink 1s infinite;vertical-align:text-bottom;margin-left:1px}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  #empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--vscode-descriptionForeground);text-align:center;padding:20px}
  #empty .icon{font-size:32px;margin-bottom:4px}
  #empty h3{font-size:13px;font-weight:600;color:var(--vscode-foreground)}
  #empty p{font-size:11px;line-height:1.5}
  .chip{display:inline-block;border:1px solid var(--vscode-button-border,var(--vscode-widget-border));border-radius:12px;padding:4px 10px;font-size:10px;cursor:pointer;margin:3px 2px;transition:background 0.1s}
  .chip:hover{background:var(--vscode-list-hoverBackground)}
  #footer{border-top:1px solid var(--vscode-sideBar-border);padding:8px;flex-shrink:0}
  #input-row{display:flex;gap:6px;align-items:flex-end}
  textarea{flex:1;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:4px;padding:6px 8px;font-family:var(--vscode-font-family);font-size:12px;resize:none;min-height:36px;max-height:120px;outline:none}
  textarea:focus{border-color:var(--vscode-focusBorder)}
  button{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;padding:6px 10px;cursor:pointer;font-size:12px;flex-shrink:0;height:36px}
  button:hover{background:var(--vscode-button-hoverBackground)}
  button:disabled{opacity:0.5;cursor:not-allowed}
  #server-info{font-size:10px;color:var(--vscode-descriptionForeground);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
</head>
<body>
<div id="header">
  <span class="logo">⚡ CodeForge AI</span>
  <span class="model" id="model-label">${model.split("/")[1] ?? model}</span>
</div>
<div id="messages">
  <div id="empty">
    <div class="icon">🤖</div>
    <h3>CodeForge AI Agent</h3>
    <p>Select code in the editor and use<br><b>Right-click → CodeForge AI</b><br>or type a message below.</p>
    <div style="margin-top:8px">
      <span class="chip" onclick="setInput('Explain the selected code')">Explain code</span>
      <span class="chip" onclick="setInput('Fix all bugs and issues')">Fix bugs</span>
      <span class="chip" onclick="setInput('Generate unit tests')">Generate tests</span>
      <span class="chip" onclick="setInput('Refactor for readability')">Refactor</span>
      <span class="chip" onclick="setInput('Add TypeScript types')">Add types</span>
      <span class="chip" onclick="setInput('Search for best practices for this code')">Best practices</span>
    </div>
  </div>
</div>
<div id="footer">
  <div id="input-row">
    <textarea id="input" placeholder="Ask the AI agent..." rows="1"></textarea>
    <button id="send-btn" onclick="send()">Send</button>
  </div>
  <div id="server-info">Server: ${serverUrl}</div>
</div>
<script>
const vscode = acquireVsCodeApi();
const messages = document.getElementById('messages');
const empty = document.getElementById('empty');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const serverInfo = document.getElementById('server-info');
const modelLabel = document.getElementById('model-label');
let streaming = false;
let streamEl = null;

vscode.postMessage({ type: 'ready' });

window.addEventListener('message', e => {
  const msg = e.data;
  if (msg.type === 'config') {
    serverInfo.textContent = 'Server: ' + msg.serverUrl;
    modelLabel.textContent = (msg.model || '').split('/')[1] || msg.model;
  }
  if (msg.type === 'userMessage') addMessage(msg.text, 'user');
  if (msg.type === 'streamStart') {
    hideEmpty();
    streaming = true;
    sendBtn.disabled = true;
    streamEl = document.createElement('div');
    streamEl.className = 'msg assistant';
    streamEl.innerHTML = '<span class="cursor"></span>';
    messages.appendChild(streamEl);
    scrollBottom();
  }
  if (msg.type === 'token' && streamEl) {
    const cursor = streamEl.querySelector('.cursor');
    if (cursor) cursor.remove();
    streamEl.innerHTML = renderMarkdown(streamEl.textContent + msg.token) + '<span class="cursor"></span>';
    scrollBottom();
  }
  if (msg.type === 'streamEnd') {
    if (streamEl) {
      const cursor = streamEl.querySelector('.cursor');
      if (cursor) cursor.remove();
    }
    streaming = false;
    sendBtn.disabled = false;
    streamEl = null;
    scrollBottom();
  }
  if (msg.type === 'error') {
    addMessage(msg.text, 'error');
    streaming = false;
    sendBtn.disabled = false;
  }
  if (msg.type === 'cleared') {
    messages.innerHTML = '';
    messages.appendChild(empty);
    empty.style.display = 'flex';
  }
});

function send() {
  const text = input.value.trim();
  if (!text || streaming) return;
  addMessage(text, 'user');
  input.value = '';
  autoResize();
  vscode.postMessage({ type: 'send', text });
}

function setInput(text) { input.value = text; input.focus(); }

function addMessage(text, role) {
  hideEmpty();
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  if (role === 'assistant') el.innerHTML = renderMarkdown(text);
  else el.textContent = text;
  messages.appendChild(el);
  scrollBottom();
}

function hideEmpty() {
  empty.style.display = 'none';
}

function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function autoResize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
}

function renderMarkdown(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\`\`\`(\\w*)?\\n?([\\s\\S]*?)\`\`\`/g, (_,lang,code) =>
      '<pre><code>' + code.trim() + '</code></pre>')
    .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
    .replace(/\\*\\*([^\\*]+)\\*\\*/g, '<b>$1</b>')
    .replace(/\\*([^\\*]+)\\*/g, '<i>$1</i>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/\\n/g, '<br>');
}

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
input.addEventListener('input', autoResize);
</script>
</body>
</html>`;
  }
}

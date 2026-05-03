import * as vscode from "vscode";
import { CodeForgeClient } from "../client";
import { getNonce } from "../util";

const OR_MODELS = [
  { id: "mistralai/mistral-7b-instruct:free",          label: "Mistral 7B",              group: "OpenRouter" },
  { id: "meta-llama/llama-3.1-8b-instruct:free",       label: "Llama 3.1 8B",            group: "OpenRouter" },
  { id: "meta-llama/llama-3-8b-instruct:free",         label: "Llama 3 8B",              group: "OpenRouter" },
  { id: "microsoft/phi-3-mini-128k-instruct:free",     label: "Phi-3 Mini 128k",         group: "OpenRouter" },
  { id: "google/gemma-3-12b-it:free",                  label: "Gemma 3 12B",             group: "OpenRouter" },
  { id: "google/gemma-2-9b-it:free",                   label: "Gemma 2 9B",              group: "OpenRouter" },
  { id: "deepseek/deepseek-r1:free",                   label: "DeepSeek R1",             group: "OpenRouter" },
  { id: "deepseek/deepseek-r1-distill-llama-70b:free", label: "DeepSeek R1 Distill 70B", group: "OpenRouter" },
  { id: "qwen/qwen-2.5-7b-instruct:free",              label: "Qwen 2.5 7B",             group: "OpenRouter" },
  { id: "mistralai/mistral-nemo:free",                 label: "Mistral Nemo 12B",        group: "OpenRouter" },
  { id: "openchat/openchat-7b:free",                   label: "OpenChat 7B",             group: "OpenRouter" },
];
const GROQ_MODELS = [
  { id: "groq/llama-3.3-70b-versatile",         label: "Llama 3.3 70B ⚡",    group: "Groq" },
  { id: "groq/llama-3.1-8b-instant",            label: "Llama 3.1 8B ⚡",     group: "Groq" },
  { id: "groq/llama3-70b-8192",                 label: "Llama 3 70B ⚡",      group: "Groq" },
  { id: "groq/llama3-8b-8192",                  label: "Llama 3 8B ⚡",       group: "Groq" },
  { id: "groq/mixtral-8x7b-32768",              label: "Mixtral 8x7B ⚡",     group: "Groq" },
  { id: "groq/gemma2-9b-it",                    label: "Gemma 2 9B ⚡",       group: "Groq" },
  { id: "groq/deepseek-r1-distill-llama-70b",   label: "DeepSeek R1 70B ⚡",  group: "Groq" },
];
const ALL_MODELS = [...OR_MODELS, ...GROQ_MODELS];

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _sessionId?: string;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly client: CodeForgeClient,
  ) {
    this._sessionId = client.currentSessionId;
  }

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
          await this._loadSession();
          break;
        case "send":
          await this._handleSend(msg.content);
          break;
        case "newSession":
          await this.createSession(msg.title ?? "New Session", msg.model);
          break;
        case "changeModel": {
          const cfg = vscode.workspace.getConfiguration("codeforge");
          await cfg.update("model", msg.model, vscode.ConfigurationTarget.Global);
          break;
        }
        case "openBrowser":
          vscode.env.openExternal(vscode.Uri.parse(this.client.baseUrl));
          break;
        case "copyCode":
          vscode.env.clipboard.writeText(msg.code);
          vscode.window.showInformationMessage("Code copied to clipboard!");
          break;
        case "insertCode":
          this._insertCode(msg.code);
          break;
        case "applyToFile":
          await this._applyToFile(msg.code, msg.lang);
          break;
        case "applyDiff":
          await this._applyDiff(msg.original, msg.modified, msg.lang);
          break;
      }
    });
  }

  /** Called by extension.ts when selectModel command changes the model */
  postModelChange(modelId: string, label: string) {
    this._view?.webview.postMessage({ type: "modelChanged", modelId, label });
  }

  async createSession(title: string, model?: string) {
    try {
      const cfg = vscode.workspace.getConfiguration("codeforge");
      const chosenModel = model ?? cfg.get<string>("model", ALL_MODELS[0].id);
      const session = await this.client.createSession(title, chosenModel);
      this._sessionId = session.id;
      await this.client.setCurrentSessionId(session.id);
      this._view?.webview.postMessage({ type: "sessionCreated", session });
    } catch (err: any) {
      vscode.window.showErrorMessage(`CodeForge: ${err.message}`);
    }
  }

  async sendMessage(content: string) {
    if (!this._sessionId) {
      const cfg = vscode.workspace.getConfiguration("codeforge");
      const model = cfg.get<string>("model", ALL_MODELS[0].id);
      const session = await this.client.createSession("VS Code Session", model);
      this._sessionId = session.id;
      await this.client.setCurrentSessionId(session.id);
      this._view?.webview.postMessage({ type: "sessionCreated", session });
    }
    await this._handleSend(content);
  }

  private async _loadSession() {
    if (!this._sessionId) {
      this._view?.webview.postMessage({ type: "noSession" });
      return;
    }
    try {
      const messages = await this.client.getMessages(this._sessionId);
      this._view?.webview.postMessage({ type: "messages", messages, sessionId: this._sessionId });
    } catch {
      this._view?.webview.postMessage({ type: "noSession" });
    }
  }

  private async _handleSend(content: string) {
    if (!content?.trim()) return;
    if (!this._sessionId) {
      await this.createSession("VS Code Session");
    }
    const sessionId = this._sessionId!;
    const cfg = vscode.workspace.getConfiguration("codeforge");
    let finalContent = content;
    if (cfg.get<boolean>("includeFileContext", true)) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const doc  = editor.document;
        const lang = doc.languageId;
        const rel  = vscode.workspace.asRelativePath(doc.uri);
        const sel  = editor.selection;
        const text = sel.isEmpty
          ? doc.getText().slice(0, 6000)
          : doc.getText(sel);
        if (text.trim()) {
          finalContent += `\n\n**Context: \`${rel}\`**\n\`\`\`${lang}\n${text}\n\`\`\``;
        }
      }
    }
    this._view?.webview.postMessage({ type: "userMessage", content });
    this._view?.webview.postMessage({ type: "streamStart" });
    try {
      await this.client.sendMessage(sessionId, finalContent);
      for await (const event of this.client.streamResponse(sessionId)) {
        if (event.type === "token" && event.token) {
          this._view?.webview.postMessage({ type: "token", token: event.token });
        } else if (event.type === "route" && event.plan) {
          this._view?.webview.postMessage({ type: "route", plan: event.plan });
        } else if (event.type === "done") {
          this._view?.webview.postMessage({ type: "streamEnd" });
          return;
        }
      }
      this._view?.webview.postMessage({ type: "streamEnd" });
    } catch (err: any) {
      this._view?.webview.postMessage({ type: "error", message: err.message });
    }
  }

  private _insertCode(code: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    editor.edit((eb) => eb.replace(editor.selection, code));
  }

  private async _applyToFile(code: string, lang: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { vscode.window.showErrorMessage("No active file."); return; }
    const original = editor.document.getText();
    await this._applyDiff(original, code, lang);
  }

  private async _applyDiff(original: string, modified: string, _lang: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const choice = await vscode.window.showWarningMessage(
      "Apply AI-generated code to the active file?",
      { modal: true },
      "Apply", "Discard",
    );
    if (choice === "Apply") {
      await editor.edit((eb) => {
        const full = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(original.length),
        );
        eb.replace(full, modified);
      });
      vscode.window.showInformationMessage("CodeForge: Changes applied.");
    } else {
      vscode.window.showInformationMessage("CodeForge: Changes discarded.");
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce      = getNonce();
    const serverUrl  = vscode.workspace.getConfiguration("codeforge").get<string>("serverUrl", "http://localhost:3000");
    const cfg        = vscode.workspace.getConfiguration("codeforge");
    const curModel   = cfg.get<string>("model", ALL_MODELS[0].id);
    const curLabel   = ALL_MODELS.find((m) => m.id === curModel)?.label ?? curModel;

    // Build <option> HTML for the inline select
    const orOptions   = OR_MODELS.map((m) =>
      `<option value="${m.id}"${m.id === curModel ? " selected" : ""}>${m.label}</option>`
    ).join("");
    const groqOptions = GROQ_MODELS.map((m) =>
      `<option value="${m.id}"${m.id === curModel ? " selected" : ""}>${m.label}</option>`
    ).join("");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src ${serverUrl} https:; img-src https: data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: 12px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    #header { padding: 6px 10px; border-bottom: 1px solid var(--vscode-sideBar-border); display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    #header-title { font-weight: 600; font-size: 11px; color: var(--vscode-sideBar-foreground); flex: 1; }
    #status-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; flex-shrink: 0; }
    button.icon-btn { background: none; border: none; cursor: pointer; color: var(--vscode-icon-foreground); padding: 2px; border-radius: 3px; display: flex; align-items: center; }
    button.icon-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
    #model-bar { padding: 5px 10px; border-bottom: 1px solid var(--vscode-sideBar-border); display: flex; align-items: center; gap-6px; background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background)); flex-shrink: 0; }
    #model-bar label { font-size: 10px; color: var(--vscode-descriptionForeground); white-space: nowrap; margin-right: 5px; }
    #model-select { flex: 1; font-size: 10px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 3px; color: var(--vscode-input-foreground); padding: 2px 4px; outline: none; cursor: pointer; }
    #model-select:focus { border-color: var(--vscode-focusBorder); }
    optgroup { font-size: 10px; }
    #messages { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
    .msg { display: flex; flex-direction: column; gap: 2px; max-width: 100%; }
    .msg.user { align-items: flex-end; }
    .msg.agent, .msg.streaming { align-items: flex-start; }
    .bubble { padding: 7px 10px; border-radius: 8px; font-size: 12px; line-height: 1.5; max-width: 92%; word-break: break-word; white-space: pre-wrap; }
    .msg.user .bubble { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 8px 8px 2px 8px; }
    .msg.agent .bubble, .msg.streaming .bubble { background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 8px 8px 8px 2px; }
    .agent-label { font-size: 10px; color: var(--vscode-textLink-foreground); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .code-block { position: relative; margin: 6px 0; }
    .code-lang { font-size: 10px; color: var(--vscode-descriptionForeground); background: var(--vscode-editor-background); padding: 2px 8px; border-radius: 4px 4px 0 0; border: 1px solid var(--vscode-panel-border); border-bottom: none; font-family: var(--vscode-editor-font-family); display: flex; justify-content: space-between; align-items: center; }
    .code-actions { display: flex; gap: 4px; }
    .code-action-btn { font-size: 10px; padding: 1px 6px; border-radius: 3px; cursor: pointer; border: none; }
    .code-action-btn.apply  { background: #4ade80; color: #000; font-weight: 600; }
    .code-action-btn.apply:hover  { background: #22c55e; }
    .code-action-btn.insert { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .code-action-btn.insert:hover { background: var(--vscode-button-hoverBackground); }
    .code-action-btn.copy   { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .code-action-btn.copy:hover   { background: var(--vscode-button-secondaryHoverBackground); }
    pre { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 0 0 4px 4px; padding: 8px; overflow-x: auto; font-family: var(--vscode-editor-font-family); font-size: 11px; line-height: 1.4; }
    .cursor { display: inline-block; width: 2px; height: 13px; background: var(--vscode-button-background); animation: blink 0.8s infinite; vertical-align: middle; margin-left: 2px; border-radius: 1px; }
    @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
    .route-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 7px; border-radius: 10px; margin-bottom: 4px; font-weight: 500; }
    .route-badge.research { background: rgba(34,211,238,0.15); color: #22d3ee; }
    .route-badge.code     { background: rgba(74,222,128,0.15); color: #4ade80; }
    .route-badge.direct   { background: rgba(167,139,250,0.15); color: #a78bfa; }
    .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--vscode-descriptionForeground); text-align: center; padding: 16px; }
    .empty-state .icon { font-size: 28px; margin-bottom: 4px; }
    .prompts { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 100%; margin-top: 8px; }
    .prompt-btn { font-size: 10px; padding: 5px 7px; background: var(--vscode-editor-inactiveSelectionBackground); border: 1px solid var(--vscode-panel-border); border-radius: 5px; cursor: pointer; text-align: left; color: var(--vscode-foreground); line-height: 1.3; }
    .prompt-btn:hover { border-color: var(--vscode-button-background); color: var(--vscode-button-background); }
    #input-area { padding: 8px; border-top: 1px solid var(--vscode-sideBar-border); flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; }
    #input-row { display: flex; gap: 5px; align-items: flex-end; }
    textarea { flex: 1; resize: none; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 5px; color: var(--vscode-input-foreground); font-family: var(--vscode-font-family); font-size: 12px; padding: 6px 8px; min-height: 36px; max-height: 120px; outline: none; line-height: 1.4; }
    textarea:focus { border-color: var(--vscode-focusBorder); }
    #send-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 5px; width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; }
    #send-btn:hover { background: var(--vscode-button-hoverBackground); }
    #send-btn:disabled { opacity: 0.5; cursor: default; }
    #new-session-bar { display: flex; gap: 4px; }
    #session-title-input { flex: 1; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 4px; color: var(--vscode-input-foreground); font-size: 11px; padding: 3px 7px; outline: none; }
    #create-btn { font-size: 10px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 3px 10px; cursor: pointer; white-space: nowrap; }
    .apply-toast { position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%); background: #4ade80; color: #000; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 600; z-index: 999; display: none; }
  </style>
</head>
<body>
<div id="header">
  <div id="status-dot"></div>
  <span id="header-title">CodeForge AI</span>
  <button class="icon-btn" id="new-btn" title="New Session">＋</button>
  <button class="icon-btn" id="browser-btn" title="Open in browser">⎋</button>
</div>

<div id="model-bar">
  <label>Model:</label>
  <select id="model-select" title="Select AI model (Ctrl+Shift+M for full picker)">
    <optgroup label="— OpenRouter (Free) —">
      ${orOptions}
    </optgroup>
    <optgroup label="— Groq (Ultra-fast) —">
      ${groqOptions}
    </optgroup>
  </select>
</div>

<div id="messages"></div>
<div class="apply-toast" id="apply-toast">✓ Applied!</div>

<div id="input-area">
  <div id="new-session-bar" style="display:none">
    <input id="session-title-input" placeholder="Session name..." />
    <button id="create-btn">Create</button>
  </div>
  <div id="input-row">
    <textarea id="input" placeholder="Ask the agent to fix, explain, refactor, or build..." rows="2"></textarea>
    <button id="send-btn" title="Send (Enter)">➤</button>
  </div>
</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const messagesEl        = document.getElementById('messages');
  const inputEl           = document.getElementById('input');
  const sendBtn           = document.getElementById('send-btn');
  const newBtn            = document.getElementById('new-btn');
  const browserBtn        = document.getElementById('browser-btn');
  const newBar            = document.getElementById('new-session-bar');
  const sessionTitleInput = document.getElementById('session-title-input');
  const createBtn         = document.getElementById('create-btn');
  const applyToast        = document.getElementById('apply-toast');
  const modelSelect       = document.getElementById('model-select');

  let isStreaming    = false;
  let streamingBubble = null;
  let streamingContent = '';

  // Sync model picker → extension settings
  modelSelect.addEventListener('change', () => {
    vscode.postMessage({ type: 'changeModel', model: modelSelect.value });
  });

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function showToast(msg) {
    applyToast.textContent = msg;
    applyToast.style.display = 'block';
    setTimeout(() => { applyToast.style.display = 'none'; }, 2500);
  }
  function renderContent(text) {
    const parts = text.split(/(\\x60\\x60\\x60[\\s\\S]*?\\x60\\x60\\x60)/g);
    return parts.map(part => {
      if (part.startsWith('\\x60\\x60\\x60')) {
        const inner = part.slice(3, -3);
        const nlIdx = inner.indexOf('\\n');
        const lang  = nlIdx === -1 ? '' : inner.slice(0, nlIdx).trim();
        const code  = nlIdx === -1 ? inner : inner.slice(nlIdx + 1);
        const escapedCode = escHtml(code);
        const escapedLang = escHtml(lang || 'code');
        const codeJson = JSON.stringify(code);
        const langJson = JSON.stringify(lang);
        return \`<div class="code-block">
          <div class="code-lang">
            <span>\${escapedLang}</span>
            <div class="code-actions">
              <button class="code-action-btn apply"  onclick="applyToFile(\${codeJson},\${langJson})">⚡ Apply</button>
              <button class="code-action-btn insert" onclick="insertCode(\${codeJson})">Insert</button>
              <button class="code-action-btn copy"   onclick="copyCode(\${codeJson})">Copy</button>
            </div>
          </div>
          <pre>\${escapedCode}</pre>
        </div>\`;
      }
      return \`<span style="white-space:pre-wrap">\${escHtml(part)}</span>\`;
    }).join('');
  }
  function copyCode(code)    { vscode.postMessage({ type:'copyCode', code }); showToast('✓ Copied!'); }
  function insertCode(code)  { vscode.postMessage({ type:'insertCode', code }); showToast('✓ Inserted!'); }
  function applyToFile(code, lang) { vscode.postMessage({ type:'applyToFile', code, lang }); }

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = \`msg \${role}\`;
    if (role !== 'user') {
      div.innerHTML = \`<div class="agent-label">codeforge agent</div><div class="bubble">\${renderContent(content)}</div>\`;
    } else {
      div.innerHTML = \`<div class="bubble">\${escHtml(content)}</div>\`;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showEmpty() {
    messagesEl.innerHTML = \`<div class="empty-state">
      <div class="icon">⬡</div>
      <strong style="font-size:13px">CodeForge AI</strong>
      <span style="font-size:11px">Select code + right-click, or type below</span>
      <div class="prompts">
        <button class="prompt-btn" onclick="quickPrompt('Explain this file')">Explain this file</button>
        <button class="prompt-btn" onclick="quickPrompt('Find and fix all bugs')">Fix all bugs</button>
        <button class="prompt-btn" onclick="quickPrompt('Generate unit tests')">Generate tests</button>
        <button class="prompt-btn" onclick="quickPrompt('Search for best practices')">Search web</button>
      </div>
    </div>\`;
  }

  function quickPrompt(text) { inputEl.value = text; inputEl.focus(); }

  function renderMessages(messages) {
    messagesEl.innerHTML = '';
    if (!messages || messages.length === 0) { showEmpty(); return; }
    messages.forEach(m => addMessage(m.role === 'agent' ? 'agent' : m.role, m.content));
  }

  window.addEventListener('message', e => {
    const msg = e.data;
    switch (msg.type) {
      case 'noSession':
        showEmpty();
        newBar.style.display = 'flex';
        break;
      case 'messages':
        renderMessages(msg.messages);
        newBar.style.display = 'none';
        break;
      case 'sessionCreated':
        messagesEl.innerHTML = '';
        showEmpty();
        newBar.style.display = 'none';
        break;
      case 'modelChanged':
        // Update the inline select when changed via command palette
        modelSelect.value = msg.modelId;
        showToast(\`Model: \${msg.label}\`);
        break;
      case 'userMessage':
        if (!document.querySelector('.msg')) messagesEl.innerHTML = '';
        addMessage('user', msg.content);
        break;
      case 'streamStart':
        isStreaming = true;
        sendBtn.disabled = true;
        streamingContent = '';
        const wrap = document.createElement('div');
        wrap.className = 'msg streaming';
        wrap.innerHTML = '<div class="agent-label">codeforge agent</div><div class="bubble"><span class="cursor"></span></div>';
        messagesEl.appendChild(wrap);
        streamingBubble = wrap.querySelector('.bubble');
        messagesEl.scrollTop = messagesEl.scrollHeight;
        break;
      case 'token':
        if (streamingBubble) {
          streamingContent += msg.token;
          streamingBubble.innerHTML = renderContent(streamingContent) + '<span class="cursor"></span>';
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        break;
      case 'route':
        if (streamingBubble) {
          const badge = document.createElement('div');
          badge.className = \`route-badge \${msg.plan}\`;
          badge.innerHTML = msg.plan === 'research' ? '🔍 Searching web...' : msg.plan === 'code' ? '💻 Coding mode' : '⚡ Direct answer';
          streamingBubble.parentElement.insertBefore(badge, streamingBubble);
        }
        break;
      case 'streamEnd':
      case 'done':
        isStreaming = false;
        sendBtn.disabled = false;
        if (streamingBubble) {
          streamingBubble.innerHTML = renderContent(streamingContent);
          streamingBubble.parentElement.className = 'msg agent';
          streamingBubble = null;
          streamingContent = '';
        }
        break;
      case 'error':
        isStreaming = false;
        sendBtn.disabled = false;
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:var(--vscode-errorForeground);font-size:11px;padding:4px 8px;';
        errDiv.textContent = \`Error: \${msg.message}\`;
        messagesEl.appendChild(errDiv);
        break;
    }
  });

  function send() {
    const content = inputEl.value.trim();
    if (!content || isStreaming) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    vscode.postMessage({ type: 'send', content });
  }

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  newBtn.addEventListener('click', () => {
    newBar.style.display = newBar.style.display === 'none' ? 'flex' : 'none';
    if (newBar.style.display === 'flex') sessionTitleInput.focus();
  });

  createBtn.addEventListener('click', () => {
    const title = sessionTitleInput.value.trim() || 'VS Code Session';
    vscode.postMessage({ type: 'newSession', title, model: modelSelect.value });
    sessionTitleInput.value = '';
    newBar.style.display = 'none';
  });

  sessionTitleInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') createBtn.click();
  });

  browserBtn.addEventListener('click', () => vscode.postMessage({ type: 'openBrowser' }));

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
  }
}

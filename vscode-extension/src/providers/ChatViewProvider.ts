import * as vscode from "vscode";
import * as path from "path";
import { CodeForgeClient } from "../client";
import { getNonce, getWebviewUri } from "../util";

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
          await this.createSession(msg.title ?? "New Session");
          break;
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

  async createSession(title: string) {
    try {
      const session = await this.client.createSession(title);
      this._sessionId = session.id;
      await this.client.setCurrentSessionId(session.id);
      this._view?.webview.postMessage({ type: "sessionCreated", session });
    } catch (err: any) {
      vscode.window.showErrorMessage(`CodeForge: ${err.message}`);
    }
  }

  async sendMessage(content: string) {
    if (!this._sessionId) {
      const session = await this.client.createSession("VS Code Session");
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
      if (editor && !content.includes("```")) {
        const fileName = editor.document.fileName.split(/[\\/]/).pop();
        const lang = editor.document.languageId;
        const sel = editor.selection;
        const selectedText = sel.isEmpty ? "" : editor.document.getText(sel);
        if (selectedText) {
          finalContent = `${content}\n\n**File:** \`${fileName}\` (selection)\n\`\`\`${lang}\n${selectedText}\n\`\`\``;
        }
      }
    }

    this._view?.webview.postMessage({ type: "userMessage", content: finalContent });

    try {
      await this.client.sendMessage(sessionId, finalContent);
    } catch (err: any) {
      this._view?.webview.postMessage({ type: "error", message: err.message });
      return;
    }

    this._view?.webview.postMessage({ type: "streamStart" });
    try {
      for await (const chunk of this.client.streamResponse(sessionId)) {
        this._view?.webview.postMessage(chunk);
      }
    } catch (err: any) {
      this._view?.webview.postMessage({ type: "error", message: err.message });
    }
    this._view?.webview.postMessage({ type: "streamEnd" });
  }

  private _insertCode(code: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("No active editor to insert code into.");
      return;
    }
    editor.edit((builder) => {
      builder.replace(editor.selection, code);
    });
  }

  /**
   * Apply to File — replaces the entire active file content with AI code,
   * showing a diff view first so the user can review before accepting.
   */
  private async _applyToFile(code: string, lang: string) {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      // No active editor — ask user to pick a file
      const picked = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        title: "Apply AI code to which file?",
        filters: lang ? { [lang]: [lang] } : { "All Files": ["*"] },
      });
      if (!picked?.length) return;

      const doc = await vscode.workspace.openTextDocument(picked[0]);
      await vscode.window.showTextDocument(doc);
      await this._showDiffAndApply(doc, code);
      return;
    }

    await this._showDiffAndApply(editor.document, code);
  }

  /**
   * Apply a diff with original and modified text, showing a proper diff editor.
   */
  private async _applyDiff(original: string, modified: string, lang: string) {
    const editor = vscode.window.activeTextEditor;
    const original_uri = vscode.Uri.parse(`codeforge-diff:Original`);
    const modified_uri = vscode.Uri.parse(`codeforge-diff:Modified (AI)`);

    const dp = vscode.languages.registerDocumentContentProvider("codeforge-diff", {
      provideTextDocumentContent(uri) {
        return uri.path === "Original" ? original : modified;
      },
    });

    await vscode.commands.executeCommand(
      "vscode.diff",
      original_uri,
      modified_uri,
      "CodeForge AI: Review Changes (accept by clicking ✓ Apply)",
    );

    const choice = await vscode.window.showInformationMessage(
      "Apply AI changes to the file?",
      { modal: false },
      "✓ Apply",
      "✗ Discard",
    );

    dp.dispose();

    if (choice === "✓ Apply" && editor) {
      const full = new vscode.Range(
        editor.document.lineAt(0).range.start,
        editor.document.lineAt(editor.document.lineCount - 1).range.end,
      );
      await editor.edit((b) => b.replace(full, modified));
      vscode.window.showInformationMessage("CodeForge: Changes applied!");
    }
  }

  private async _showDiffAndApply(doc: vscode.TextDocument, newCode: string) {
    const original = doc.getText();

    // Write proposed code to a virtual document for diff view
    const originalUri = doc.uri.with({ scheme: "codeforge-original" });
    const proposedUri = doc.uri.with({ scheme: "codeforge-proposed" });

    const provider = vscode.workspace.registerTextDocumentContentProvider("codeforge-original", {
      provideTextDocumentContent: () => original,
    });
    const provider2 = vscode.workspace.registerTextDocumentContentProvider("codeforge-proposed", {
      provideTextDocumentContent: () => newCode,
    });

    await vscode.commands.executeCommand(
      "vscode.diff",
      originalUri,
      proposedUri,
      `CodeForge AI → ${path.basename(doc.fileName)} (review changes)`,
    );

    const choice = await vscode.window.showInformationMessage(
      "Apply AI-generated code to this file?",
      { modal: false },
      "✓ Apply",
      "✗ Discard",
    );

    provider.dispose();
    provider2.dispose();

    if (choice === "✓ Apply") {
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        doc.lineAt(0).range.start,
        doc.lineAt(doc.lineCount - 1).range.end,
      );
      edit.replace(doc.uri, fullRange, newCode);
      await vscode.workspace.applyEdit(edit);
      await doc.save();
      vscode.window.showInformationMessage(`CodeForge: Applied changes to ${path.basename(doc.fileName)}`);
    } else {
      vscode.window.showInformationMessage("CodeForge: Changes discarded.");
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const serverUrl = vscode.workspace.getConfiguration("codeforge").get<string>("serverUrl", "http://localhost:3000");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src ${serverUrl} https:; img-src https: data:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: 12px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    #header { padding: 8px 10px; border-bottom: 1px solid var(--vscode-sideBar-border); display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    #header-title { font-weight: 600; font-size: 11px; color: var(--vscode-sideBar-foreground); flex: 1; }
    #status-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; flex-shrink: 0; }
    button.icon-btn { background: none; border: none; cursor: pointer; color: var(--vscode-icon-foreground); padding: 2px; border-radius: 3px; display: flex; align-items: center; }
    button.icon-btn:hover { background: var(--vscode-toolbar-hoverBackground); }
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
    .code-action-btn.apply { background: #4ade80; color: #000; font-weight: 600; }
    .code-action-btn.apply:hover { background: #22c55e; }
    .code-action-btn.insert { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .code-action-btn.insert:hover { background: var(--vscode-button-hoverBackground); }
    .code-action-btn.copy { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .code-action-btn.copy:hover { background: var(--vscode-button-secondaryHoverBackground); }
    pre { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 0 0 4px 4px; padding: 8px; overflow-x: auto; font-family: var(--vscode-editor-font-family); font-size: 11px; line-height: 1.4; }
    .cursor { display: inline-block; width: 2px; height: 13px; background: var(--vscode-button-background); animation: blink 0.8s infinite; vertical-align: middle; margin-left: 2px; border-radius: 1px; }
    @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
    .route-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 7px; border-radius: 10px; margin-bottom: 4px; font-weight: 500; }
    .route-badge.research { background: rgba(34,211,238,0.15); color: #22d3ee; }
    .route-badge.code { background: rgba(74,222,128,0.15); color: #4ade80; }
    .route-badge.direct { background: rgba(167,139,250,0.15); color: #a78bfa; }
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
  <span id="header-title">⚡ CodeForge AI</span>
  <button class="icon-btn" id="new-btn" title="New Session">＋</button>
  <button class="icon-btn" id="browser-btn" title="Open in browser">⎋</button>
</div>

<div id="messages"></div>
<div class="apply-toast" id="apply-toast">✓ Applied to file!</div>

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
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const newBtn = document.getElementById('new-btn');
  const browserBtn = document.getElementById('browser-btn');
  const newBar = document.getElementById('new-session-bar');
  const sessionTitleInput = document.getElementById('session-title-input');
  const createBtn = document.getElementById('create-btn');
  const applyToast = document.getElementById('apply-toast');

  let isStreaming = false;
  let streamingBubble = null;
  let streamingContent = '';

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
        const lang = nlIdx === -1 ? '' : inner.slice(0, nlIdx).trim();
        const code = nlIdx === -1 ? inner : inner.slice(nlIdx + 1);
        const escapedCode = escHtml(code);
        const escapedLang = escHtml(lang || 'code');
        const codeJson = JSON.stringify(code);
        const langJson = JSON.stringify(lang);
        return \`<div class="code-block">
          <div class="code-lang">
            <span>\${escapedLang}</span>
            <div class="code-actions">
              <button class="code-action-btn apply" onclick="applyToFile(\${codeJson}, \${langJson})" title="Apply to active file (shows diff)">⚡ Apply</button>
              <button class="code-action-btn insert" onclick="insertCode(\${codeJson})" title="Insert at cursor">Insert</button>
              <button class="code-action-btn copy" onclick="copyCode(\${codeJson})" title="Copy to clipboard">Copy</button>
            </div>
          </div>
          <pre>\${escapedCode}</pre>
        </div>\`;
      }
      return \`<span style="white-space:pre-wrap">\${escHtml(part)}</span>\`;
    }).join('');
  }

  function copyCode(code) {
    vscode.postMessage({ type: 'copyCode', code });
    showToast('✓ Copied!');
  }
  function insertCode(code) {
    vscode.postMessage({ type: 'insertCode', code });
    showToast('✓ Inserted at cursor!');
  }
  function applyToFile(code, lang) {
    vscode.postMessage({ type: 'applyToFile', code, lang });
  }

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = \`msg \${role}\`;
    if (role !== 'user') {
      div.innerHTML = \`<div class="agent-label">⚡ codeforge agent</div><div class="bubble">\${renderContent(content)}</div>\`;
    } else {
      div.innerHTML = \`<div class="bubble">\${escHtml(content)}</div>\`;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showEmpty() {
    messagesEl.innerHTML = \`<div class="empty-state">
      <div class="icon">⚡</div>
      <strong style="font-size:13px">CodeForge AI</strong>
      <span style="font-size:11px">Select code + right-click to ask AI, or type below</span>
      <div class="prompts">
        <button class="prompt-btn" onclick="quickPrompt('Explain this file')">Explain this file</button>
        <button class="prompt-btn" onclick="quickPrompt('Find and fix all bugs')">Fix all bugs</button>
        <button class="prompt-btn" onclick="quickPrompt('Generate unit tests')">Generate tests</button>
        <button class="prompt-btn" onclick="quickPrompt('Search for best practices')">Search web</button>
      </div>
    </div>\`;
  }

  function quickPrompt(text) {
    inputEl.value = text;
    inputEl.focus();
  }

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
        wrap.innerHTML = '<div class="agent-label">⚡ codeforge agent</div><div class="bubble"><span class="cursor"></span></div>';
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
    vscode.postMessage({ type: 'newSession', title });
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

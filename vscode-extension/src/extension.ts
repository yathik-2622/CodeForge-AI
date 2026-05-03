import * as vscode from "vscode";
import { ChatViewProvider } from "./providers/ChatViewProvider";
import { SessionsViewProvider } from "./providers/SessionsViewProvider";
import { CodeForgeClient } from "./client";

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("codeforge");
  const serverUrl = config.get<string>("serverUrl", "http://localhost:3000");
  const client = new CodeForgeClient(serverUrl, context);

  const chatProvider = new ChatViewProvider(context, client);
  const sessionsProvider = new SessionsViewProvider(context, client);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("codeforge.chatView", chatProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.window.registerWebviewViewProvider("codeforge.sessionsView", sessionsProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // ── Commands ────────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.openChat", () => {
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.newSession", async () => {
      const title = await vscode.window.showInputBox({
        prompt: "Session name",
        placeHolder: "e.g., Fix auth bug in api/auth.ts",
      });
      if (title) {
        await chatProvider.createSession(title);
        vscode.commands.executeCommand("workbench.view.extension.codeforge");
      }
    }),

    vscode.commands.registerCommand("codeforge.askAboutSelection", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      const question = await vscode.window.showInputBox({
        prompt: "What do you want to know about this code?",
        placeHolder: "e.g., What does this function do?",
      });
      if (question) {
        const msg = `${question}\n\n\`\`\`\n${selection}\n\`\`\``;
        await chatProvider.sendMessage(msg);
        vscode.commands.executeCommand("workbench.view.extension.codeforge");
      }
    }),

    vscode.commands.registerCommand("codeforge.fixSelection", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      const msg = `Fix the following code. Explain what was wrong and provide the corrected version:\n\n\`\`\`\n${selection}\n\`\`\``;
      await chatProvider.sendMessage(msg);
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.explainSelection", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      const lang = vscode.window.activeTextEditor?.document.languageId ?? "";
      const msg = `Explain this ${lang} code step by step:\n\n\`\`\`${lang}\n${selection}\n\`\`\``;
      await chatProvider.sendMessage(msg);
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.generateTests", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      const lang = vscode.window.activeTextEditor?.document.languageId ?? "";
      const msg = `Generate comprehensive unit tests for this ${lang} code. Include edge cases and use the appropriate testing framework:\n\n\`\`\`${lang}\n${selection}\n\`\`\``;
      await chatProvider.sendMessage(msg);
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.refactorSelection", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      const lang = vscode.window.activeTextEditor?.document.languageId ?? "";
      const msg = `Refactor this ${lang} code for better readability, performance, and maintainability. Follow best practices:\n\n\`\`\`${lang}\n${selection}\n\`\`\``;
      await chatProvider.sendMessage(msg);
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.searchWeb", async () => {
      const query = await vscode.window.showInputBox({
        prompt: "Search the web",
        placeHolder: "e.g., best practices for JWT refresh tokens 2025",
      });
      if (query) {
        await chatProvider.sendMessage(`Search for: ${query}`);
        vscode.commands.executeCommand("workbench.view.extension.codeforge");
      }
    }),

    vscode.commands.registerCommand("codeforge.openDashboard", () => {
      const url = config.get<string>("serverUrl", "http://localhost:3000");
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  );

  vscode.window.showInformationMessage("⚡ CodeForge AI is ready! Press Ctrl+Shift+A to open chat.");
}

function getSelectedText(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Open a file and select some code first.");
    return undefined;
  }
  const selection = editor.selection;
  const text = editor.document.getText(selection.isEmpty ? undefined : selection);
  if (!text?.trim()) {
    vscode.window.showWarningMessage("Select some code first.");
    return undefined;
  }
  return text.trim();
}

export function deactivate() {}

import * as vscode from "vscode";
import { ChatViewProvider } from "./ChatViewProvider";
import { CodeForgeClient } from "./client";

let provider: ChatViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  const client = new CodeForgeClient(context);
  provider = new ChatViewProvider(context, client);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("codeforge.chatView", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.openChat", () => {
      vscode.commands.executeCommand("workbench.view.extension.codeforge-sidebar");
    }),

    vscode.commands.registerCommand("codeforge.newSession", () => {
      provider?.newSession();
    }),

    vscode.commands.registerCommand("codeforge.sendSelection", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const text = editor.document.getText(editor.selection);
      const lang = editor.document.languageId;
      const file = editor.document.fileName.split(/[/\\]/).pop() ?? "";
      if (!text.trim()) {
        vscode.window.showWarningMessage("CodeForge AI: No text selected.");
        return;
      }
      provider?.sendMessage(`\`\`\`${lang}\n// File: ${file}\n${text}\n\`\`\``);
      vscode.commands.executeCommand("workbench.view.extension.codeforge-sidebar");
    }),

    vscode.commands.registerCommand("codeforge.explainCode", () => {
      sendWithPrompt("Explain this code clearly, covering what it does, how it works, and any gotchas:");
    }),

    vscode.commands.registerCommand("codeforge.fixCode", () => {
      sendWithPrompt("Find and fix all bugs, type errors, and issues in this code. Show the corrected version with explanations:");
    }),

    vscode.commands.registerCommand("codeforge.generateTests", () => {
      sendWithPrompt("Generate comprehensive unit tests for this code. Cover edge cases, error paths, and normal flow:");
    }),

    vscode.commands.registerCommand("codeforge.setServer", async () => {
      const url = await vscode.window.showInputBox({
        prompt: "Enter your CodeForge AI server URL",
        placeHolder: "https://your-codeforge-app.replit.app",
        value: vscode.workspace.getConfiguration("codeforge").get("serverUrl") ?? "",
      });
      if (url) {
        await vscode.workspace.getConfiguration("codeforge").update("serverUrl", url, true);
        vscode.window.showInformationMessage(`CodeForge AI: Server set to ${url}`);
        provider?.updateServerUrl(url);
      }
    })
  );

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("codeforge.serverUrl") || e.affectsConfiguration("codeforge.model")) {
      provider?.refresh();
    }
  }, null, context.subscriptions);

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = "codeforge.openChat";
  statusBar.text = "$(zap) CodeForge";
  statusBar.tooltip = "Open CodeForge AI Chat (Ctrl+Shift+A)";
  statusBar.show();
  context.subscriptions.push(statusBar);
}

function sendWithPrompt(prompt: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const text = editor.document.getText(editor.selection);
  const lang = editor.document.languageId;
  const file = editor.document.fileName.split(/[/\\]/).pop() ?? "";
  if (!text.trim()) {
    vscode.window.showWarningMessage("CodeForge AI: No text selected.");
    return;
  }
  provider?.sendMessage(`${prompt}\n\n\`\`\`${lang}\n// File: ${file}\n${text}\n\`\`\``);
  vscode.commands.executeCommand("workbench.view.extension.codeforge-sidebar");
}

export function deactivate() {}

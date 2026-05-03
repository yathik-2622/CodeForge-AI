import * as vscode from "vscode";
import { ChatViewProvider } from "./providers/ChatViewProvider";
import { SessionsViewProvider } from "./providers/SessionsViewProvider";
import { CodeForgeClient } from "./client";

const ALL_MODELS = [
  // OpenRouter — free
  { id: "mistralai/mistral-7b-instruct:free",          label: "Mistral 7B Instruct",         group: "OpenRouter · Free" },
  { id: "meta-llama/llama-3.1-8b-instruct:free",       label: "Llama 3.1 8B Instruct",       group: "OpenRouter · Free" },
  { id: "meta-llama/llama-3-8b-instruct:free",         label: "Llama 3 8B",                  group: "OpenRouter · Free" },
  { id: "microsoft/phi-3-mini-128k-instruct:free",     label: "Phi-3 Mini 128k",             group: "OpenRouter · Free" },
  { id: "google/gemma-3-12b-it:free",                  label: "Gemma 3 12B",                 group: "OpenRouter · Free" },
  { id: "google/gemma-2-9b-it:free",                   label: "Gemma 2 9B",                  group: "OpenRouter · Free" },
  { id: "deepseek/deepseek-r1:free",                   label: "DeepSeek R1 (Reasoning)",     group: "OpenRouter · Free" },
  { id: "deepseek/deepseek-r1-distill-llama-70b:free", label: "DeepSeek R1 Distill 70B",     group: "OpenRouter · Free" },
  { id: "qwen/qwen-2.5-7b-instruct:free",              label: "Qwen 2.5 7B",                 group: "OpenRouter · Free" },
  { id: "mistralai/mistral-nemo:free",                 label: "Mistral Nemo 12B",            group: "OpenRouter · Free" },
  { id: "openchat/openchat-7b:free",                   label: "OpenChat 7B",                 group: "OpenRouter · Free" },
  // Groq — free + ultra-fast
  { id: "groq/llama-3.3-70b-versatile",                label: "Llama 3.3 70B Versatile",     group: "Groq · Ultra-fast" },
  { id: "groq/llama-3.1-8b-instant",                   label: "Llama 3.1 8B Instant",        group: "Groq · Ultra-fast" },
  { id: "groq/llama3-70b-8192",                        label: "Llama 3 70B",                 group: "Groq · Ultra-fast" },
  { id: "groq/llama3-8b-8192",                         label: "Llama 3 8B",                  group: "Groq · Ultra-fast" },
  { id: "groq/mixtral-8x7b-32768",                     label: "Mixtral 8x7B 32k",            group: "Groq · Ultra-fast" },
  { id: "groq/gemma2-9b-it",                           label: "Gemma 2 9B",                  group: "Groq · Ultra-fast" },
  { id: "groq/deepseek-r1-distill-llama-70b",          label: "DeepSeek R1 Distill 70B",     group: "Groq · Ultra-fast" },
];

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("codeforge");
  const serverUrl = config.get<string>("serverUrl", "http://localhost:3000");
  const client = new CodeForgeClient(serverUrl, context);

  const chatProvider     = new ChatViewProvider(context, client);
  const sessionsProvider = new SessionsViewProvider(context, client);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("codeforge.chatView", chatProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.window.registerWebviewViewProvider("codeforge.sessionsView", sessionsProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // ── Commands ───────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand("codeforge.openChat", () => {
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.selectModel", async () => {
      const cfg          = vscode.workspace.getConfiguration("codeforge");
      const currentModel = cfg.get<string>("model", ALL_MODELS[0].id);
      const picks        = ALL_MODELS.map((m) => ({
        label:       m.label,
        description: m.group,
        detail:      m.id === currentModel ? "$(check) Currently selected" : m.id,
        id:          m.id,
      }));
      const picked = await vscode.window.showQuickPick(picks, {
        title:        "CodeForge AI — Select Model",
        placeHolder:  "Choose an AI model (all free)",
        matchOnDetail: true,
      });
      if (!picked) return;
      await cfg.update("model", picked.id, vscode.ConfigurationTarget.Global);
      chatProvider.postModelChange(picked.id, picked.label);
      vscode.window.showInformationMessage(`CodeForge: model set to ${picked.label}`);
    }),

    vscode.commands.registerCommand("codeforge.newSession", async () => {
      const title = await vscode.window.showInputBox({
        prompt:      "Session name",
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
        prompt:      "What do you want to know about this code?",
        placeHolder: "e.g., What does this function do?",
      });
      if (question) {
        await chatProvider.sendMessage(`${question}\n\n\`\`\`\n${selection}\n\`\`\``);
        vscode.commands.executeCommand("workbench.view.extension.codeforge");
      }
    }),

    vscode.commands.registerCommand("codeforge.fixSelection", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      await chatProvider.sendMessage(
        `Fix the following code. Explain what was wrong and provide the corrected version:\n\n\`\`\`\n${selection}\n\`\`\``,
      );
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.explainSelection", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      await chatProvider.sendMessage(`Explain this code step by step:\n\n\`\`\`\n${selection}\n\`\`\``);
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.generateTests", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      await chatProvider.sendMessage(
        `Generate comprehensive unit tests for the following code. Use the same language/framework:\n\n\`\`\`\n${selection}\n\`\`\``,
      );
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.refactorSelection", async () => {
      const selection = getSelectedText();
      if (!selection) return;
      await chatProvider.sendMessage(
        `Refactor this code for readability, performance, and best practices:\n\n\`\`\`\n${selection}\n\`\`\``,
      );
      vscode.commands.executeCommand("workbench.view.extension.codeforge");
    }),

    vscode.commands.registerCommand("codeforge.searchWeb", async () => {
      const query = await vscode.window.showInputBox({
        prompt:      "Search the web",
        placeHolder: "e.g., React 19 new features",
      });
      if (query) {
        await chatProvider.sendMessage(`Search the web for: ${query}`);
        vscode.commands.executeCommand("workbench.view.extension.codeforge");
      }
    }),

    vscode.commands.registerCommand("codeforge.openDashboard", () => {
      const cfg = vscode.workspace.getConfiguration("codeforge");
      const url = cfg.get<string>("serverUrl", "http://localhost:3000");
      vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  );
}

export function deactivate() {}

function getSelectedText(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return undefined;
  const selection = editor.document.getText(editor.selection);
  return selection.trim() || undefined;
}

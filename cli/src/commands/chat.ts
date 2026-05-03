/**
 * CodeForge AI — Interactive Chat Command
 * Like Claude Code's main REPL — full conversation loop with AI
 */
import chalk from "chalk";
import readline from "readline";
import { streamChat, type Message } from "../lib/ai";
import { loadConfig, saveConfig } from "../lib/config";
import { readProjectContext } from "../lib/files";
import { isGitRepo, getGitStatus, getCurrentBranch } from "../lib/git";
import { banner, printModel, separator, printStream, c, askQuestion, printHelp } from "../lib/display";

const HELP_CMDS = [
  { cmd: "/help",         desc: "Show this help" },
  { cmd: "/model <id>",  desc: "Switch AI model (e.g. groq/llama-3.3-70b-versatile)" },
  { cmd: "/models",      desc: "List all available models" },
  { cmd: "/context",     desc: "Show loaded project context" },
  { cmd: "/clear",       desc: "Clear conversation history" },
  { cmd: "/save <file>", desc: "Save conversation to file" },
  { cmd: "/load <file>", desc: "Load context from file" },
  { cmd: "/status",      desc: "Show git status" },
  { cmd: "/exit",        desc: "Exit CodeForge" },
];

const ALL_MODELS = [
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-12b-it:free",
  "groq/meta-llama/llama-4-maverick-17b-128e-instruct-fp8",
  "groq/meta-llama/llama-4-scout-17b-16e-instruct",
  "groq/llama-3.3-70b-versatile",
  "groq/llama-3.1-8b-instant",
  "groq/qwen-qwq-32b",
  "groq/deepseek-r1-distill-llama-70b",
  "groq/mixtral-8x7b-32768",
  "groq/compound-beta",
];

export async function chatCommand(options: { model?: string; noContext?: boolean }) {
  const cfg = loadConfig();
  if (options.model) { cfg.model = options.model; saveConfig({ model: options.model }); }

  banner();
  printModel(cfg.model);

  // Build initial system context from project
  const cwd = process.cwd();
  let projectCtx = "";
  if (!options.noContext) {
    process.stdout.write(c.dim("  Loading project context..."));
    projectCtx = readProjectContext(cwd);
    process.stdout.write("\r" + " ".repeat(40) + "\r");

    if (isGitRepo(cwd)) {
      const branch = getCurrentBranch(cwd);
      const status = getGitStatus(cwd);
      projectCtx += `\n# Git\nBranch: ${branch}\nStatus:\n${status || "(clean)"}\n`;
    }
    if (projectCtx.trim()) {
      console.log(c.dim(`  Project context loaded (${Math.round(projectCtx.length / 1024)}KB)`));
      console.log();
    }
  }

  const history: Message[] = [];
  if (projectCtx) {
    history.push({ role: "user",      content: `Here is my project context:\n\n${projectCtx}` });
    history.push({ role: "assistant", content: "Got it! I've reviewed your project. How can I help?" });
  }

  // REPL loop
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

  const prompt = () => {
    rl.question(chalk.bold.hex("#38bdf8")("\n  You › "), async (input) => {
      const text = input.trim();
      if (!text) { prompt(); return; }

      // Slash commands
      if (text === "/exit" || text === "/quit") {
        console.log(c.dim("\n  Goodbye.\n"));
        rl.close();
        process.exit(0);
      }
      if (text === "/help") { printHelp(HELP_CMDS); prompt(); return; }
      if (text === "/clear") { history.length = 0; console.log(c.success("  ✓ History cleared")); prompt(); return; }
      if (text === "/status") {
        const s = getGitStatus();
        console.log(s ? "\n" + s : c.dim("  (clean)"));
        prompt(); return;
      }
      if (text === "/models") {
        console.log(c.bold("\n  Available models:"));
        for (const m of ALL_MODELS) {
          const active = m === cfg.model ? chalk.green(" ← active") : "";
          const prov   = m.startsWith("groq/") ? chalk.hex("#f97316")("groq") : chalk.hex("#6366f1")("openrouter");
          console.log(`    [${prov}] ${m.replace(/^groq\//,"")}${active}`);
        }
        console.log(); prompt(); return;
      }
      if (text.startsWith("/model ")) {
        const m = text.slice(7).trim();
        saveConfig({ model: m });
        cfg.model = m;
        console.log(c.success(`  ✓ Model switched to ${m}`));
        printModel(m);
        prompt(); return;
      }
      if (text === "/context") {
        console.log(c.dim("\n  Context preview (first 500 chars):"));
        console.log(projectCtx.slice(0, 500));
        prompt(); return;
      }

      // Regular message — stream AI response
      history.push({ role: "user", content: text });
      console.log();
      process.stdout.write(chalk.hex("#818cf8")("  CF › "));

      let response = "";
      await new Promise<void>((res) => {
        streamChat(
          history,
          (tok) => { printStream(tok); response += tok; },
          () => { console.log("\n"); res(); },
        );
      });

      history.push({ role: "assistant", content: response });
      prompt();
    });
  };

  prompt();
}

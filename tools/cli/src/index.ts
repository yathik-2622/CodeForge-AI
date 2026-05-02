#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as readline from "readline";
import { getConfig, setConfig, getConfigPath } from "./lib/config.js";
import {
  createSession, sendMessage, streamResponse,
  listSessions, getMessages, searchWeb,
  getRepos, scanRepo, checkHealth,
} from "./lib/client.js";

const pkg = { version: "1.0.0" };

console.log(); // spacing

program
  .name("codeforge")
  .description(chalk.bold("⚡ CodeForge AI") + " — autonomous coding agent CLI")
  .version(pkg.version, "-v, --version");

// ── CONFIG ──────────────────────────────────────────────────────────────────
program
  .command("config")
  .description("Configure CodeForge CLI")
  .option("--server <url>", "CodeForge server URL")
  .option("--model <model>", "AI model to use")
  .option("--token <token>", "Auth token (JWT)")
  .option("--show", "Show current configuration")
  .action((opts) => {
    if (opts.show) {
      const cfg = getConfig();
      console.log(chalk.bold("\n  CodeForge CLI Configuration"));
      console.log(chalk.gray("  ─────────────────────────────"));
      console.log(`  ${chalk.cyan("Server:")}  ${cfg.serverUrl || chalk.red("not set")}`);
      console.log(`  ${chalk.cyan("Model:")}   ${cfg.model}`);
      console.log(`  ${chalk.cyan("Token:")}   ${cfg.authToken ? chalk.green("set") : chalk.gray("not set")}`);
      console.log(`  ${chalk.cyan("Config:")}  ${getConfigPath()}\n`);
      return;
    }
    const updates: any = {};
    if (opts.server) updates.serverUrl = opts.server;
    if (opts.model) updates.model = opts.model;
    if (opts.token) updates.authToken = opts.token;
    if (Object.keys(updates).length === 0) {
      console.log(chalk.yellow("  No options specified. Use --show to view config.\n"));
      return;
    }
    setConfig(updates);
    console.log(chalk.green("  ✓ Configuration saved to ") + chalk.gray(getConfigPath()) + "\n");
  });

// ── STATUS ──────────────────────────────────────────────────────────────────
program
  .command("status")
  .description("Check connection to CodeForge server")
  .action(async () => {
    const cfg = getConfig();
    if (!cfg.serverUrl) {
      console.log(chalk.red("  ✗ No server configured.\n  Run: ") + chalk.cyan("codeforge config --server <url>\n"));
      return;
    }
    const spinner = ora(`  Connecting to ${cfg.serverUrl}...`).start();
    const ok = await checkHealth();
    if (ok) {
      spinner.succeed(chalk.green(`  Connected to ${cfg.serverUrl}`));
    } else {
      spinner.fail(chalk.red(`  Cannot reach ${cfg.serverUrl}`));
    }
    console.log();
  });

// ── CHAT ────────────────────────────────────────────────────────────────────
program
  .command("chat [message]")
  .description("Start an interactive chat session or send a one-shot message")
  .option("-s, --session <id>", "Resume an existing session")
  .option("-m, --model <model>", "Override AI model for this session")
  .option("-t, --title <title>", "Session title", "CLI Session")
  .action(async (message, opts) => {
    const cfg = getConfig();
    if (!cfg.serverUrl) {
      console.log(chalk.red("  ✗ No server configured. Run: codeforge config --server <url>\n"));
      process.exit(1);
    }

    let sessionId = opts.session;

    if (!sessionId) {
      const spinner = ora("  Creating session...").start();
      try {
        const session = await createSession(opts.title, opts.model);
        sessionId = session.id;
        spinner.succeed(`  Session ${chalk.cyan(sessionId)} created — model: ${chalk.gray(session.model)}`);
      } catch (err: any) {
        spinner.fail(chalk.red(`  Failed: ${err.message}`));
        process.exit(1);
      }
    }

    if (message) {
      await doTurn(sessionId, message);
      return;
    }

    // Interactive mode
    console.log(chalk.dim(`\n  ${chalk.bold("CodeForge AI")} interactive chat`));
    console.log(chalk.dim("  Type your message and press Enter. Type 'exit' or Ctrl+C to quit.\n"));

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const prompt = () => rl.question(chalk.cyan("  You: "), async (input) => {
      const text = input.trim();
      if (text === "exit" || text === "quit") { rl.close(); console.log(); return; }
      if (!text) { prompt(); return; }
      await doTurn(sessionId!, text);
      prompt();
    });
    prompt();
    rl.on("close", () => { console.log(chalk.dim("\n  Session ended.\n")); process.exit(0); });
  });

async function doTurn(sessionId: string, message: string) {
  try {
    await sendMessage(sessionId, message);
  } catch (err: any) {
    console.error(chalk.red(`  ✗ ${err.message}\n`));
    return;
  }

  process.stdout.write(chalk.bold.blue("\n  Agent: "));
  let hasOutput = false;

  await streamResponse(
    sessionId,
    (token) => {
      hasOutput = true;
      process.stdout.write(token);
    },
    () => {
      if (!hasOutput) process.stdout.write(chalk.gray("(no response)"));
      process.stdout.write("\n\n");
    },
  );
}

// ── SESSIONS ─────────────────────────────────────────────────────────────────
program
  .command("sessions")
  .description("List recent chat sessions")
  .action(async () => {
    const spinner = ora("  Fetching sessions...").start();
    try {
      const sessions = await listSessions();
      spinner.stop();
      if (sessions.length === 0) {
        console.log(chalk.gray("  No sessions yet. Start one with: codeforge chat\n"));
        return;
      }
      console.log(chalk.bold("\n  Recent Sessions"));
      console.log(chalk.gray("  ───────────────────────────────────────────────────────"));
      for (const s of sessions.slice(0, 20)) {
        console.log(`  ${chalk.cyan(s.id.padEnd(4))} ${chalk.white(s.title.padEnd(30))} ${chalk.gray(s.model.split("/")[1] ?? s.model)}`);
      }
      console.log(chalk.dim(`\n  Resume: codeforge chat --session <id>\n`));
    } catch (err: any) {
      spinner.fail(chalk.red(`  ${err.message}`));
    }
  });

// ── SEARCH ───────────────────────────────────────────────────────────────────
program
  .command("search <query>")
  .description("Search the web via Tavily AI")
  .action(async (query) => {
    const spinner = ora(`  Searching: "${query}"...`).start();
    try {
      const result = await searchWeb(query);
      spinner.stop();
      console.log(chalk.bold(`\n  Web Search: ${query}\n`));
      for (const r of result.results ?? []) {
        console.log(`  ${chalk.cyan("•")} ${chalk.white(r.title)}`);
        console.log(`    ${chalk.gray(r.url)}`);
        console.log(`    ${chalk.dim(r.content?.slice(0, 120))}...\n`);
      }
    } catch (err: any) {
      spinner.fail(chalk.red(`  ${err.message}`));
    }
  });

// ── REPOS ─────────────────────────────────────────────────────────────────────
program
  .command("repos")
  .description("List connected repositories")
  .action(async () => {
    const spinner = ora("  Fetching repositories...").start();
    try {
      const repos = await getRepos();
      spinner.stop();
      if (repos.length === 0) {
        console.log(chalk.gray("  No repositories connected yet.\n"));
        return;
      }
      console.log(chalk.bold("\n  Connected Repositories"));
      console.log(chalk.gray("  ──────────────────────────────────────────────────────────────"));
      for (const r of repos) {
        const status = r.status === "ready" ? chalk.green("ready") : chalk.yellow(r.status);
        console.log(`  ${chalk.cyan(r.id.padEnd(4))} ${chalk.white(r.fullName.padEnd(35))} ${chalk.gray(r.language.padEnd(12))} ${status}`);
      }
      console.log(chalk.dim(`\n  Scan a repo: codeforge scan <id>\n`));
    } catch (err: any) {
      spinner.fail(chalk.red(`  ${err.message}`));
    }
  });

// ── SCAN ──────────────────────────────────────────────────────────────────────
program
  .command("scan <repo-id>")
  .description("Scan a repository for analysis")
  .action(async (id) => {
    const spinner = ora(`  Scanning repository ${id}...`).start();
    try {
      const result = await scanRepo(id);
      spinner.succeed(chalk.green(`  Scan started for repository ${id}`));
      console.log(chalk.dim(`  Status: ${result.status}\n`));
    } catch (err: any) {
      spinner.fail(chalk.red(`  ${err.message}`));
    }
  });

// ── MODELS ────────────────────────────────────────────────────────────────────
program
  .command("models")
  .description("List available free AI models")
  .action(() => {
    console.log(chalk.bold("\n  Available Free AI Models (via OpenRouter)\n"));
    const models = [
      { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B", best: "General coding, default" },
      { id: "meta-llama/llama-3-8b-instruct:free", label: "Llama 3 8B", best: "Code generation" },
      { id: "microsoft/phi-3-mini-128k-instruct:free", label: "Phi-3 Mini", best: "Long context (128K)" },
      { id: "google/gemma-3-12b-it:free", label: "Gemma 3 12B", best: "Code analysis" },
    ];
    for (const m of models) {
      console.log(`  ${chalk.cyan("•")} ${chalk.white(m.label.padEnd(16))} ${chalk.gray(m.best)}`);
      console.log(`    ${chalk.dim(m.id)}`);
    }
    console.log(chalk.dim(`\n  Switch model: codeforge config --model <id>\n`));
  });

// ── HELP BANNER ───────────────────────────────────────────────────────────────
program.addHelpText("after", `
${chalk.bold("Examples:")}
  ${chalk.cyan("$")} codeforge config --server https://myapp.replit.app
  ${chalk.cyan("$")} codeforge status
  ${chalk.cyan("$")} codeforge chat "How do I fix this React hook?"
  ${chalk.cyan("$")} codeforge chat                    ${chalk.gray("# interactive mode")}
  ${chalk.cyan("$")} codeforge chat --session 5       ${chalk.gray("# resume session")}
  ${chalk.cyan("$")} codeforge search "JWT best practices 2025"
  ${chalk.cyan("$")} codeforge repos
  ${chalk.cyan("$")} codeforge scan 3
  ${chalk.cyan("$")} codeforge models

${chalk.bold("Quick install:")}
  ${chalk.cyan("$")} npm install -g @codeforge/cli
`);

program.parse();

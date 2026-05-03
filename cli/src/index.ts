#!/usr/bin/env node
/**
 * CodeForge AI CLI — Autonomous coding agent in your terminal
 *
 * Commands:
 *   cf                      Interactive chat (default)
 *   cf chat                 Interactive REPL — full conversation with AI
 *   cf ask  <question>      One-shot question, no REPL
 *   cf run  <command>       Run command; AI auto-diagnoses + fixes on failure
 *   cf fix  <file>          AI-powered code fix with apply confirmation
 *   cf explain <file>       Explain code in plain English
 *   cf analyze <path>       Deep analysis of file or directory
 *   cf commit               AI-generated conventional commit message
 *   cf models               List all available models
 *   cf config               Manage CLI configuration
 *   cf status               Show server + config status
 */
import { Command } from "commander";
import chalk from "chalk";
import { chatCommand }    from "./commands/chat";
import { analyzeCommand } from "./commands/analyze";
import { fixCommand }     from "./commands/fix";
import { explainCommand } from "./commands/explain";
import { commitCommand }  from "./commands/commit";
import { runCommand }     from "./commands/run";
import { loadConfig, saveConfig, getConfigPath } from "./lib/config";
import { c, banner } from "./lib/display";

const pkg = require("../package.json");

const program = new Command();

program
  .name("codeforge")
  .aliases(["cf"])
  .description("CodeForge AI — autonomous coding agent CLI")
  .version(pkg.version, "-v, --version");

// Default: interactive chat
program.action(async () => { await chatCommand({}); });

// ── chat ──────────────────────────────────────────────────────────────────────
program
  .command("chat")
  .description("Interactive AI chat REPL with project context (like Claude Code)")
  .option("-m, --model <id>", "AI model to use")
  .option("--no-context",     "Don't load project files as context")
  .action(async (opts) => { await chatCommand(opts); });

// ── ask ───────────────────────────────────────────────────────────────────────
program
  .command("ask <question>")
  .description("One-shot question — get an answer without entering the REPL")
  .option("-m, --model <id>", "AI model to use")
  .action(async (question: string, opts) => {
    if (opts.model) saveConfig({ model: opts.model });
    const { streamChat } = require("./lib/ai");
    console.log();
    process.stdout.write(chalk.hex("#818cf8")("  CF › "));
    await new Promise<void>((res) => {
      streamChat(
        [{ role: "user", content: question }],
        (tok: string) => process.stdout.write(tok),
        () => { console.log("\n"); res(); },
      );
    });
  });

// ── run ───────────────────────────────────────────────────────────────────────
program
  .command("run <command>")
  .description("Run a shell command — if it fails, AI diagnoses and auto-fixes the error")
  .option("-f, --fix",               "Auto-apply AI fixes without asking")
  .option("-w, --watch",             "Re-run after each fix attempt")
  .option("-n, --max-attempts <n>",  "Max fix attempts (default: 3)", "3")
  .option("-m, --model <id>",        "AI model to use")
  .action(async (command: string, opts) => {
    if (opts.model) saveConfig({ model: opts.model });
    await runCommand(command, opts);
  });

// ── fix ───────────────────────────────────────────────────────────────────────
program
  .command("fix <file>")
  .description("AI-powered code fix — shows diff and asks to apply")
  .option("-i, --issue <msg>", "Describe the issue to fix")
  .option("-y, --apply",       "Auto-apply without confirmation")
  .option("-m, --model <id>",  "AI model to use")
  .action(async (file: string, opts) => {
    if (opts.model) saveConfig({ model: opts.model });
    await fixCommand(file, opts.issue || "", opts);
  });

// ── explain ───────────────────────────────────────────────────────────────────
program
  .command("explain <file>")
  .description("Explain code in plain English")
  .option("--simple",         "Explain for a beginner")
  .option("--expert",         "Explain for a senior engineer")
  .option("-m, --model <id>", "AI model to use")
  .action(async (file: string, opts) => {
    if (opts.model) saveConfig({ model: opts.model });
    await explainCommand(file, opts);
  });

// ── analyze ───────────────────────────────────────────────────────────────────
program
  .command("analyze [path]")
  .description("Analyze a file or directory for bugs, security, and improvements")
  .option("--security",       "Focus on security vulnerabilities")
  .option("--perf",           "Focus on performance issues")
  .option("-m, --model <id>", "AI model to use")
  .action(async (target = ".", opts) => {
    if (opts.model) saveConfig({ model: opts.model });
    await analyzeCommand(target, opts);
  });

// ── commit ────────────────────────────────────────────────────────────────────
program
  .command("commit")
  .description("Generate a conventional commit message from staged/unstaged diff")
  .option("-a, --all",        "Stage all changes first")
  .option("-m, --model <id>", "AI model to use")
  .action(async (opts) => {
    if (opts.model) saveConfig({ model: opts.model });
    await commitCommand(opts);
  });

// ── models ────────────────────────────────────────────────────────────────────
program
  .command("models")
  .description("List all available AI models")
  .action(() => {
    const cfg = loadConfig();
    const ALL = [
      { id:"mistralai/mistral-7b-instruct:free",                          p:"openrouter", label:"Mistral 7B Instruct"      },
      { id:"meta-llama/llama-3.1-8b-instruct:free",                      p:"openrouter", label:"Llama 3.1 8B Instruct"    },
      { id:"google/gemma-3-12b-it:free",                                  p:"openrouter", label:"Gemma 3 12B"              },
      { id:"deepseek/deepseek-r1:free",                                   p:"openrouter", label:"DeepSeek R1 (Reasoning)"  },
      { id:"deepseek/deepseek-r1-distill-llama-70b:free",                 p:"openrouter", label:"DeepSeek R1 Distill 70B" },
      { id:"qwen/qwen-2.5-7b-instruct:free",                              p:"openrouter", label:"Qwen 2.5 7B"             },
      { id:"openchat/openchat-7b:free",                                   p:"openrouter", label:"OpenChat 7B"             },
      { id:"mistralai/mistral-nemo:free",                                 p:"openrouter", label:"Mistral Nemo 12B"        },
      { id:"groq/meta-llama/llama-4-maverick-17b-128e-instruct-fp8",      p:"groq",       label:"Llama 4 Maverick (128E)"  },
      { id:"groq/meta-llama/llama-4-scout-17b-16e-instruct",              p:"groq",       label:"Llama 4 Scout (16E)"      },
      { id:"groq/llama-3.3-70b-versatile",                                p:"groq",       label:"Llama 3.3 70B Versatile" },
      { id:"groq/llama-3.1-8b-instant",                                   p:"groq",       label:"Llama 3.1 8B Instant"    },
      { id:"groq/qwen-qwq-32b",                                           p:"groq",       label:"Qwen QwQ 32B"            },
      { id:"groq/deepseek-r1-distill-llama-70b",                          p:"groq",       label:"DeepSeek R1 Distill 70B" },
      { id:"groq/deepseek-r1-distill-qwen-32b",                           p:"groq",       label:"DeepSeek R1 Distill 32B" },
      { id:"groq/mixtral-8x7b-32768",                                     p:"groq",       label:"Mixtral 8x7B"            },
      { id:"groq/gemma2-9b-it",                                           p:"groq",       label:"Gemma 2 9B"              },
      { id:"groq/compound-beta",                                           p:"groq",       label:"Compound Beta (Agentic)" },
    ];
    console.log();
    console.log(c.brand("  Available models (23 total):"));
    console.log();
    let lastP = "";
    for (const m of ALL) {
      if (m.p !== lastP) {
        const ph = m.p === "groq"
          ? chalk.hex("#f97316").bold("\n  Groq — Ultra-fast (needs GROQ_API_KEY)")
          : chalk.hex("#6366f1").bold("\n  OpenRouter — Free (needs OPENROUTER_API_KEY)");
        console.log(ph);
        lastP = m.p;
      }
      const active = m.id === cfg.model ? chalk.green(" ← active") : "";
      const id     = m.id.replace(/^groq\//,"").replace(/:free$/,"");
      console.log(`    ${c.dim(id.padEnd(54))}${c.muted(m.label)}${active}`);
    }
    console.log();
    console.log(c.dim("  Switch model:") + " cf config --model <id>");
    console.log();
  });

// ── config ────────────────────────────────────────────────────────────────────
program
  .command("config")
  .description("View or set CLI configuration (keys saved to ~/.codeforge/config.json)")
  .option("--model <id>",           "Set default AI model")
  .option("--openrouter-key <key>", "Save OpenRouter API key (free at openrouter.ai/keys)")
  .option("--groq-key <key>",       "Save Groq API key (free at console.groq.com/keys)")
  .option("--server-url <url>",     "Set node_api URL (default: http://localhost:3000)")
  .option("--show",                 "Show current config")
  .action((opts) => {
    let changed = false;
    if (opts.openrouterKey) { saveConfig({ openrouterApiKey: opts.openrouterKey }); console.log(c.success("  ✓ OpenRouter API key saved")); changed = true; }
    if (opts.groqKey)       { saveConfig({ groqApiKey: opts.groqKey });              console.log(c.success("  ✓ Groq API key saved"));       changed = true; }
    if (opts.model)         { saveConfig({ model: opts.model });                     console.log(c.success(`  ✓ Model set to ${opts.model}`)); changed = true; }
    if (opts.serverUrl)     { saveConfig({ serverUrl: opts.serverUrl });             console.log(c.success(`  ✓ Server URL set to ${opts.serverUrl}`)); changed = true; }
    // Always show current config after changes or when --show / no args
    const cfg = loadConfig();
    console.log();
    console.log(c.brand("  CodeForge CLI Config"));
    console.log(c.dim("  File: " + getConfigPath()));
    console.log();
    console.log(`  Model:          ${c.cyan(cfg.model)}`);
    console.log(`  OpenRouter key: ${cfg.openrouterApiKey ? c.success("✓ set") : c.warn("not set — run: cf config --openrouter-key sk-or-v1-...")}`);
    console.log(`  Groq key:       ${cfg.groqApiKey       ? c.success("✓ set") : c.warn("not set — run: cf config --groq-key gsk_...")}`);
    console.log(`  Server URL:     ${c.dim(cfg.serverUrl)}`);
    console.log();
  });

// ── status ────────────────────────────────────────────────────────────────────
program
  .command("status")
  .description("Check configuration and server connectivity")
  .action(async () => {
    const cfg = loadConfig();
    console.log();
    console.log(c.brand("  ⚡ CodeForge AI — Status"));
    console.log();
    console.log(`  OpenRouter: ${cfg.openrouterApiKey ? c.success("✓ configured") : c.warn("not set")}`);
    console.log(`  Groq:       ${cfg.groqApiKey       ? c.success("✓ configured") : c.warn("not set")}`);
    console.log(`  Model:      ${c.cyan(cfg.model)}`);
    console.log();
    process.stdout.write(c.dim(`  Pinging ${cfg.serverUrl}...`));
    try {
      const fetch = require("node-fetch");
      const r     = await fetch(`${cfg.serverUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      process.stdout.write("\r" + " ".repeat(50) + "\r");
      console.log(`  node_api:   ${c.success("✓ online")} ${c.dim("(:" + new URL(cfg.serverUrl).port + ")")}`);
    } catch {
      process.stdout.write("\r" + " ".repeat(50) + "\r");
      console.log(`  node_api:   ${c.dim("offline — start with: cd node_api && npm run dev")}`);
    }
    try {
      const fetch = require("node-fetch");
      const r     = await fetch("http://localhost:9000/api/health", { signal: AbortSignal.timeout(3000) });
      const data  = await r.json() as any;
      console.log(`  FastAPI:    ${c.success("✓ online")} ${c.dim("MongoDB: " + (data?.services?.mongodb ?? "unknown"))}`);
    } catch {
      console.log(`  FastAPI:    ${c.dim("offline — start with: cd backend && uvicorn main:app --port 9000")}`);
    }
    console.log();
  });

program.parse(process.argv);

/**
 * CodeForge AI — Run Command
 * Execute a shell command. If it fails, AI diagnoses the error
 * and auto-fixes it, then retries — like Claude Code's autonomous loop.
 *
 * Usage:
 *   cf run "npm test"                        run once, prompt on failure
 *   cf run "npm test" --fix                  auto-apply fixes, prompt to retry
 *   cf run "npm test" --watch                fully autonomous loop until pass
 *   cf run "cargo build" --max-attempts 5    retry up to 5 times
 */
import { spawnSync } from "child_process";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import { streamChat, oneShot, type Message } from "../lib/ai";
import { readFile, writeFile, fileExists, detectLanguage } from "../lib/files";
import { c, askQuestion } from "../lib/display";

interface RunOptions {
  fix?:         boolean;
  watch?:       boolean;
  maxAttempts?: string;
  model?:       string;
}

export async function runCommand(shellCmd: string, options: RunOptions) {
  const maxAttempts = parseInt(options.maxAttempts ?? "3", 10);
  const isWatch     = !!options.watch;    // fully autonomous: no prompts, auto-apply + auto-retry
  const autoFix     = !!options.fix || isWatch;

  console.log();
  console.log(c.brand("  ⚡ CodeForge AI Run") + c.dim(` — ${shellCmd}`));
  if (isWatch) {
    console.log(c.dim("  Watch mode: AI will auto-fix and retry until the command passes."));
  }
  console.log(c.dim("  " + "─".repeat(54)));
  console.log();

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    // ── Run the command ───────────────────────────────────────────────────────
    const label = attempt === 0 ? "Running" : `Retry ${attempt}/${maxAttempts}`;
    process.stdout.write(c.dim(`  [${label}] ${shellCmd}\n`));

    const result = execShell(shellCmd);

    if (result.exitCode === 0) {
      // ✅ Success
      if (result.stdout.trim()) {
        result.stdout.trim().split("\n").forEach((l) => console.log(c.dim("  " + l)));
      }
      console.log();
      if (attempt === 0) {
        console.log(c.success("  ✓ Command passed"));
      } else {
        console.log(c.success(`  ✓ Command passed after ${attempt} AI fix attempt${attempt > 1 ? "s" : ""}!`));
      }
      console.log();
      return;
    }

    // ✗ Failed — show tail of output
    console.log(chalk.red(`  ✗ Failed (exit ${result.exitCode})`));
    console.log();
    const errorLines = [...result.stdout.split("\n"), ...result.stderr.split("\n")]
      .filter((l) => l.trim())
      .slice(-25);
    for (const line of errorLines) {
      const isErr = /error|Error|ERROR|fail|FAIL|warn|Warn/i.test(line);
      console.log(isErr ? chalk.red("  " + line) : c.dim("  " + line));
    }
    console.log();

    if (attempt >= maxAttempts) {
      console.log(c.warn(`  Max attempts (${maxAttempts}) reached. Could not auto-fix.`));
      console.log(c.dim("  Tip: increase with --max-attempts 5"));
      console.log();
      break;
    }

    // ── Ask to diagnose (unless watch/fix mode) ───────────────────────────────
    if (!autoFix) {
      const want = await askQuestion(c.cyan("  Ask AI to diagnose and fix this? (Y/n) › "));
      if (want.toLowerCase() === "n") return;
    }

    console.log();
    console.log(c.dim(`  AI diagnosing error (attempt ${attempt + 1}/${maxAttempts})...`));
    console.log();

    // ── Build error context ────────────────────────────────────────────────────
    const errorText = (result.stderr || result.stdout || "").slice(0, 5000);
    const fileRefs  = extractFilePaths(errorText, process.cwd());
    const fileCtx   = buildFileContext(fileRefs);

    const messages: Message[] = [
      {
        role: "user",
        content: `I ran this command and it failed. Analyze the error and provide exact file fixes.

## Command
\`\`\`
${shellCmd}
\`\`\`

## Error Output
\`\`\`
${errorText}
\`\`\`

${fileCtx ? `## Relevant Source Files\n${fileCtx}` : ""}

## Instructions
1. Identify the exact root cause.
2. For EACH file that needs changing, use this format:

<fix file="relative/path/to/file.ext">
\`\`\`language
complete corrected file content
\`\`\`
</fix>

3. After all <fix> blocks, write a one-line summary of what was wrong.

If no files need changing (e.g. missing package), state the exact command to run.`,
      },
    ];

    // ── Stream AI response ────────────────────────────────────────────────────
    process.stdout.write(chalk.hex("#818cf8")("  CF › "));
    let diagnosis = "";
    await new Promise<void>((res) => {
      streamChat(
        messages,
        (tok) => { process.stdout.write(tok); diagnosis += tok; },
        () => { console.log("\n"); res(); },
      );
    });

    // ── Parse + apply file fixes ──────────────────────────────────────────────
    const fixes = extractFixes(diagnosis);

    if (fixes.length === 0) {
      console.log(c.dim("  No file fixes found in AI response."));
      if (!isWatch) break;
      // In watch mode keep going — maybe next attempt will see different error
      continue;
    }

    console.log(c.bold(`  ${fixes.length} fix${fixes.length > 1 ? "es" : ""} suggested:`));
    for (const fix of fixes) {
      console.log(`    ${c.cyan(fix.filePath)}`);
    }
    console.log();

    let doApply = autoFix;
    if (!doApply) {
      const ans = await askQuestion(c.cyan("  Apply fixes and retry? (Y/n) › "));
      doApply   = ans.toLowerCase() !== "n";
    }

    if (!doApply) break;

    let applied = 0;
    for (const fix of fixes) {
      try {
        const dir = path.dirname(fix.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        writeFile(fix.filePath, fix.content);
        console.log(c.success(`  ✓ Applied → ${fix.filePath}`));
        applied++;
      } catch (e: any) {
        console.log(c.error(`  ✗ Could not write ${fix.filePath}: ${e.message}`));
      }
    }

    if (applied === 0) {
      console.log(c.warn("  No files were written. Breaking loop."));
      break;
    }

    console.log();
    console.log(c.dim("  " + "─".repeat(54)));
    console.log();
    // Loop continues — re-runs the command at top of for loop
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function execShell(cmd: string): { exitCode: number; stdout: string; stderr: string } {
  const r = spawnSync(cmd, {
    shell: true, cwd: process.cwd(), encoding: "utf-8", maxBuffer: 10 * 1024 * 1024,
  });
  return { exitCode: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function extractFilePaths(errorText: string, cwd: string): string[] {
  const patterns = [
    /(?:error|warning|at)\s+([a-zA-Z0-9_./@\\-]+\.[a-z]{1,5})(?::\d+)?/gi,
    /File\s+"([^"]+)"/g,
    /([a-zA-Z0-9_./@\\-]+\.(?:ts|tsx|js|jsx|py|go|rs|java|cpp|c|rb|php)):\d+/g,
  ];
  const found = new Set<string>();
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(errorText)) !== null) {
      const abs = path.isAbsolute(m[1]) ? m[1] : path.join(cwd, m[1]);
      if (fileExists(abs) && !abs.includes("node_modules")) found.add(abs);
    }
  }
  return Array.from(found).slice(0, 6);
}

function buildFileContext(filePaths: string[]): string {
  return filePaths.map((fp) => {
    try {
      const lang = detectLanguage(fp);
      const body = readFile(fp).slice(0, 2000);
      const rel  = path.relative(process.cwd(), fp);
      return `### ${rel}\n\`\`\`${lang}\n${body}\n\`\`\``;
    } catch { return ""; }
  }).filter(Boolean).join("\n\n");
}

function extractFixes(text: string): Array<{ filePath: string; content: string }> {
  const fixes: Array<{ filePath: string; content: string }> = [];
  const re = /<fix\s+file="([^"]+)">([\s\S]*?)<\/fix>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const filePath    = m[1].trim();
    const codeMatch   = m[2].match(/```[\w]*\n?([\s\S]*?)```/);
    const content     = codeMatch ? codeMatch[1] : m[2].trim();
    if (filePath && content) fixes.push({ filePath, content });
  }
  return fixes;
}

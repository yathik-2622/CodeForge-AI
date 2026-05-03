/**
 * CodeForge AI — Run Command
 * Execute a shell command. If it fails, AI automatically diagnoses the error
 * and suggests (or applies) a fix — like Claude Code's autonomous shell mode.
 *
 * Usage:
 *   cf run "npm test"
 *   cf run "python main.py" --fix            auto-fix files AI identifies
 *   cf run "cargo build"    --watch          re-run after each AI fix attempt
 *   cf run "pytest tests/"  --max-attempts 3 retry up to 3 times
 */
import { execSync, spawnSync } from "child_process";
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
  let attempt = 0;

  console.log();
  console.log(c.brand("  ⚡ CodeForge AI Run") + c.dim(` — ${shellCmd}`));
  console.log(c.dim("  " + "─".repeat(54)));
  console.log();

  while (attempt <= maxAttempts) {
    const result = execShell(shellCmd);

    if (result.exitCode === 0) {
      // Success
      if (result.stdout) process.stdout.write(result.stdout);
      console.log();
      console.log(c.success(`  ✓ Command succeeded`));
      if (attempt > 0) console.log(c.success(`  Fixed after ${attempt} attempt${attempt > 1 ? "s" : ""}!`));
      console.log();
      return;
    }

    // Failed — show output
    console.log(chalk.red(`  ✗ Command failed (exit code ${result.exitCode})`));
    console.log();
    if (result.stdout) {
      console.log(c.muted("  STDOUT:"));
      result.stdout.split("\n").slice(-20).forEach((l) => console.log(c.dim("  " + l)));
    }
    if (result.stderr) {
      console.log(chalk.red("  STDERR:"));
      result.stderr.split("\n").slice(-30).forEach((l) => console.log(chalk.red("  " + l)));
    }
    console.log();

    if (!options.fix && attempt === 0) {
      // Ask if they want AI diagnosis
      const want = await askQuestion(c.cyan("  Ask AI to diagnose and fix this? (Y/n) › "));
      if (want.toLowerCase() === "n") return;
    }

    attempt++;
    if (attempt > maxAttempts) {
      console.log(c.warn(`  Reached max attempts (${maxAttempts}). Could not auto-fix.`));
      break;
    }

    console.log(c.dim(`  AI diagnosing error (attempt ${attempt}/${maxAttempts})...\n`));

    // Build error context — read files mentioned in the error
    const errorText  = (result.stderr || result.stdout || "").slice(0, 4000);
    const fileRefs   = extractFilePaths(errorText, process.cwd());
    const fileCtx    = buildFileContext(fileRefs);

    const messages: Message[] = [
      {
        role: "user",
        content: `I ran this command and it failed. Please analyze the error and fix it.

## Command
\`\`\`
${shellCmd}
\`\`\`

## Error Output
\`\`\`
${errorText}
\`\`\`

${fileCtx ? `## Relevant Files\n${fileCtx}` : ""}

## Instructions
1. Identify the exact cause of the error.
2. For each file that needs to be changed, provide the fix in this EXACT format:

<fix file="path/to/file.ext">
\`\`\`language
complete fixed file content here
\`\`\`
</fix>

3. After all fixes, briefly explain what was wrong.
If no file changes are needed (e.g. a missing package), give the exact command to run instead.`,
      },
    ];

    console.log(chalk.hex("#818cf8")("  CF › ") + c.dim("Diagnosing...\n  "));

    let diagnosis = "";
    await new Promise<void>((res) => {
      streamChat(messages, (tok) => {
        process.stdout.write(tok);
        diagnosis += tok;
      }, () => { console.log("\n"); res(); });
    });

    // Extract and apply file fixes
    const fixes = extractFixes(diagnosis);
    if (fixes.length === 0) {
      console.log(c.dim("  No file fixes suggested. Review the AI response above."));
      if (!options.watch) break;
    } else {
      console.log(c.bold(`\n  AI suggested ${fixes.length} file fix${fixes.length > 1 ? "es" : ""}:`));
      for (const fix of fixes) {
        console.log(`    ${c.cyan(fix.filePath)}`);
      }
      console.log();

      let applyAll = options.fix;
      if (!applyAll) {
        const ans = await askQuestion(c.cyan("  Apply all fixes and retry? (Y/n) › "));
        applyAll  = ans.toLowerCase() !== "n";
      }

      if (!applyAll) break;

      for (const fix of fixes) {
        try {
          const dir = path.dirname(fix.filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          writeFile(fix.filePath, fix.content);
          console.log(c.success(`  ✓ Applied fix to ${fix.filePath}`));
        } catch (e: any) {
          console.log(c.error(`  ✗ Could not write ${fix.filePath}: ${e.message}`));
        }
      }

      console.log();
      console.log(c.dim(`  Retrying: ${shellCmd}`));
      console.log(c.dim("  " + "─".repeat(54)));
      console.log();
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function execShell(cmd: string): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync(cmd, { shell: true, cwd: process.cwd(), encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  return {
    exitCode: result.status ?? 1,
    stdout:   result.stdout ?? "",
    stderr:   result.stderr ?? "",
  };
}

/** Extract file paths mentioned in the error output */
function extractFilePaths(errorText: string, cwd: string): string[] {
  const patterns = [
    /(?:error|warning|at)\s+([a-zA-Z0-9_/\\.-]+\.[a-z]{1,5})(?::\d+)?/gi,
    /File\s+"([^"]+)"/g,
    /([a-zA-Z0-9_/\\.-]+\.[ts|js|py|go|rs|java|cpp|c|rb]+):\d+/g,
  ];
  const found = new Set<string>();
  for (const re of patterns) {
    let m;
    while ((m = re.exec(errorText)) !== null) {
      const candidate = m[1];
      const abs = path.isAbsolute(candidate) ? candidate : path.join(cwd, candidate);
      if (fileExists(abs) && !abs.includes("node_modules")) found.add(abs);
    }
  }
  return Array.from(found).slice(0, 6);
}

/** Build a context string with contents of referenced files */
function buildFileContext(filePaths: string[]): string {
  const parts: string[] = [];
  for (const fp of filePaths) {
    try {
      const lang    = detectLanguage(fp);
      const content = readFile(fp).slice(0, 2000);
      const rel     = path.relative(process.cwd(), fp);
      parts.push(`### ${rel}\n\`\`\`${lang}\n${content}\n\`\`\``);
    } catch {}
  }
  return parts.join("\n\n");
}

/** Parse <fix file="...">```lang\ncontent\n```</fix> blocks from AI response */
function extractFixes(text: string): Array<{ filePath: string; content: string }> {
  const fixes: Array<{ filePath: string; content: string }> = [];
  const fixRe = /<fix\s+file="([^"]+)">([\s\S]*?)<\/fix>/gi;
  let m: RegExpExecArray | null;

  while ((m = fixRe.exec(text)) !== null) {
    const filePath = m[1].trim();
    const inner    = m[2].trim();
    // Strip code fences if present
    const codeMatch = inner.match(/```[\w]*\n?([\s\S]*?)```/);
    const content   = codeMatch ? codeMatch[1] : inner;
    if (filePath && content) fixes.push({ filePath, content });
  }
  return fixes;
}

/** Tiny helper reused from display.ts to avoid circular imports */
function c_muted(s: string) { return chalk.hex("#64748b")(s); }

/**
 * CodeForge AI — Generate Command
 * Creates a complete, production-ready file from a description.
 *
 * Usage:
 *   cf generate "FastAPI endpoint for user registration with JWT"
 *   cf generate "React hook to debounce an input" --out src/hooks/useDebounce.ts
 *   cf generate "PostgreSQL schema for a blog" --lang sql --out schema.sql
 */
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { streamChat, type Message } from "../lib/ai";
import { writeFile, detectLanguage } from "../lib/files";
import { c, askQuestion } from "../lib/display";

export interface GenerateOptions {
  out?:  string;
  lang?: string;
}

export async function generateCommand(description: string, options: GenerateOptions) {
  console.log();
  console.log(c.brand("  ⚡ CodeForge AI Generate"));
  console.log(c.dim(`  Description: ${description}`));
  if (options.lang) console.log(c.dim(`  Language: ${options.lang}`));
  if (options.out)  console.log(c.dim(`  Output:   ${options.out}`));
  console.log();

  // Detect language from output path if provided, otherwise from description
  const lang = options.lang ?? inferLang(description, options.out);

  const messages: Message[] = [
    {
      role: "user",
      content: `Generate a complete, production-ready ${lang} file for: "${description}"

Requirements:
- Write the FULL file — no placeholders, no "TODO" comments, no stubs
- Use proper error handling, types, and modern patterns
- Add brief inline comments only where the logic is non-obvious
- Follow ${lang} best practices and conventions
- Make it immediately usable in a real project

${options.out ? `The file will be saved as: ${options.out}` : ""}

IMPORTANT: Reply with ONLY the file content inside a single \`\`\`${lang} ... \`\`\` code block. Nothing else.`,
    },
  ];

  console.log(c.dim("  Generating..."));
  console.log();
  process.stdout.write(chalk.hex("#818cf8")("  CF › \n\n"));

  let result = "";
  await new Promise<void>((res) => {
    streamChat(
      messages,
      (tok) => { process.stdout.write(tok); result += tok; },
      () => { console.log("\n"); res(); },
    );
  });

  // Extract code block
  const match = result.match(/```[\w]*\n?([\s\S]*?)```/);
  if (!match) {
    console.log(c.error("  Could not extract generated code."));
    return;
  }

  const generated = match[1].trim();

  // Determine output path
  let outPath = options.out;
  if (!outPath) {
    const suggested = suggestFilename(description, lang);
    const answer = await askQuestion(
      c.cyan(`  Save as [${suggested}] (enter path or press ENTER to accept) › `),
    );
    outPath = answer.trim() || suggested;
  }

  // Confirm if file already exists
  if (fs.existsSync(outPath)) {
    const overwrite = await askQuestion(
      c.warn(`  ⚠  ${outPath} already exists. Overwrite? (y/N) › `),
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log(c.dim("  Generation discarded."));
      return;
    }
  }

  // Create directories if needed
  const dir = path.dirname(outPath);
  if (dir && dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(c.dim(`  Created directory: ${dir}`));
  }

  writeFile(outPath, generated);
  console.log(c.success(`  ✓ Generated → ${outPath}`));
  console.log(c.dim(`  ${generated.split("\n").length} lines, ${(Buffer.byteLength(generated) / 1024).toFixed(1)}kb`));
  console.log();
  console.log(c.dim(`  Next: cf explain ${outPath}  |  cf fix ${outPath}  |  cf analyze ${outPath}`));
  console.log();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LANG_HINTS: Array<[RegExp, string]> = [
  [/react|jsx|tsx|component|hook|context|next\.?js/i, "tsx"],
  [/express|fastify|node|server|api route/i,          "typescript"],
  [/python|fastapi|django|flask|pydantic/i,            "python"],
  [/sql|postgres|mysql|schema|migration|query/i,       "sql"],
  [/rust|cargo/i,                                      "rust"],
  [/go|golang/i,                                       "go"],
  [/java(?!script)/i,                                  "java"],
  [/kotlin/i,                                          "kotlin"],
  [/swift/i,                                           "swift"],
  [/bash|shell|script/i,                               "bash"],
  [/css|style|tailwind/i,                              "css"],
  [/html/i,                                            "html"],
  [/yaml|yml|config/i,                                 "yaml"],
];

const EXT_MAP: Record<string, string> = {
  typescript: "ts", tsx: "tsx", python: "py", sql: "sql",
  rust: "rs",       go: "go",   java: "java", kotlin: "kt",
  swift: "swift",   bash: "sh", css: "css",   html: "html",
  yaml: "yaml",     javascript: "js", jsx: "jsx",
};

function inferLang(description: string, outPath?: string): string {
  if (outPath) {
    const ext = path.extname(outPath).slice(1);
    if (ext) return ext;
  }
  for (const [re, lang] of LANG_HINTS) {
    if (re.test(description)) return lang;
  }
  return "typescript"; // safe default
}

function suggestFilename(description: string, lang: string): string {
  const ext  = EXT_MAP[lang] ?? lang;
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1))
    .join("");
  return `${slug || "generated"}.${ext}`;
}

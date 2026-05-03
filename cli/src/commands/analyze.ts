/**
 * CodeForge AI — Analyze Command
 * Deep analysis of a file or entire project — like Codex analyze
 */
import chalk from "chalk";
import path from "path";
import { oneShot, type Message } from "../lib/ai";
import { readFile, readProjectContext, collectFiles, detectLanguage } from "../lib/files";
import { c } from "../lib/display";

export async function analyzeCommand(target: string, options: { full?: boolean; security?: boolean; perf?: boolean }) {
  const isDir  = require("fs").statSync(target).isDirectory();
  const label  = isDir ? `directory: ${path.basename(target)}` : `file: ${path.basename(target)}`;

  console.log();
  console.log(c.brand("  ⚡ CodeForge AI") + c.dim(` — analyzing ${label}`));
  console.log();

  let content: string;
  let focus = "code quality, architecture, potential bugs, and improvements";

  if (options.security) focus = "security vulnerabilities, injection risks, authentication flaws, and OWASP Top 10";
  if (options.perf)     focus = "performance bottlenecks, memory leaks, slow algorithms, and optimization opportunities";

  if (isDir) {
    process.stdout.write(c.dim("  Collecting project files..."));
    content = readProjectContext(target, 16000);
    process.stdout.write("\r" + " ".repeat(40) + "\r");
  } else {
    const raw  = readFile(target);
    const lang = detectLanguage(target);
    content = `File: ${target}\nLanguage: ${lang}\n\n\`\`\`${lang}\n${raw}\n\`\`\``;
  }

  const messages: Message[] = [
    {
      role: "user",
      content: `Analyze the following code for ${focus}.

For each issue found, provide:
1. **Severity**: Critical / High / Medium / Low / Info
2. **Location**: File and line/function if possible
3. **Issue**: Clear description
4. **Fix**: Concrete code example

${content}

End with a summary scorecard.`,
    },
  ];

  console.log(c.dim("  Analyzing... (this may take a moment)\n"));

  const result = await oneShot(messages);

  // Pretty print the result
  const lines = result.split("\n");
  for (const line of lines) {
    if (line.startsWith("# ") || line.startsWith("## ")) {
      console.log(chalk.bold.hex("#38bdf8")(line));
    } else if (line.includes("Critical") || line.includes("CRITICAL")) {
      console.log(chalk.red(line));
    } else if (line.includes("High") || line.includes("HIGH")) {
      console.log(chalk.hex("#f97316")(line));
    } else if (line.includes("Medium") || line.includes("MEDIUM")) {
      console.log(chalk.yellow(line));
    } else if (line.startsWith("```")) {
      console.log(chalk.hex("#64748b")(line));
    } else {
      console.log(line);
    }
  }
  console.log();
}

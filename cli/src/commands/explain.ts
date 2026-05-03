/**
 * CodeForge AI — Explain Command
 * Explain any code file or snippet in plain English
 */
import chalk from "chalk";
import path from "path";
import { oneShot, type Message } from "../lib/ai";
import { readFile, detectLanguage } from "../lib/files";
import { c } from "../lib/display";

export async function explainCommand(filePath: string, options: { simple?: boolean; expert?: boolean }) {
  const lang    = detectLanguage(filePath);
  const content = readFile(filePath);
  const name    = path.basename(filePath);
  const level   = options.simple ? "a complete beginner" : options.expert ? "a senior engineer" : "a mid-level developer";

  console.log();
  console.log(c.brand("  ⚡ CodeForge AI") + c.dim(` — explaining ${name}`));
  console.log();

  const messages: Message[] = [
    {
      role: "user",
      content: `Explain the following ${lang} code to ${level}.

File: ${filePath}
\`\`\`${lang}
${content.slice(0, 8000)}${content.length > 8000 ? "\n...(file truncated for brevity)" : ""}
\`\`\`

Cover:
1. **Purpose** — What does this code do overall?
2. **Key components** — Functions, classes, modules
3. **Data flow** — How data moves through the code
4. **Important patterns** — Design patterns, algorithms used
5. **Dependencies** — What does it rely on?
${!options.simple ? "6. **Potential improvements** — What could be better?" : ""}`,
    },
  ];

  const result = await oneShot(messages);

  const lines = result.split("\n");
  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      console.log(chalk.bold.hex("#38bdf8")(line));
    } else if (line.startsWith("**") && line.endsWith("**")) {
      console.log(chalk.bold(line));
    } else {
      console.log(line);
    }
  }
  console.log();
}

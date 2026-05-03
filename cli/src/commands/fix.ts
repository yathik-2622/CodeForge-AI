/**
 * CodeForge AI — Fix Command
 * AI-powered code fix — applies changes to the file after confirmation
 */
import chalk from "chalk";
import path from "path";
import { oneShot, type Message } from "../lib/ai";
import { readFile, writeFile, detectLanguage } from "../lib/files";
import { c, askQuestion } from "../lib/display";

export async function fixCommand(filePath: string, issue: string, options: { apply?: boolean }) {
  const lang    = detectLanguage(filePath);
  const content = readFile(filePath);
  const name    = path.basename(filePath);

  console.log();
  console.log(c.brand("  ⚡ CodeForge AI") + c.dim(` — fixing ${name}`));
  if (issue) console.log(c.dim(`  Issue: ${issue}`));
  console.log();

  const messages: Message[] = [
    {
      role: "user",
      content: `Fix the following ${lang} code${issue ? ` to resolve: "${issue}"` : " — fix all bugs and issues you find"}.

File: ${filePath}
\`\`\`${lang}
${content}
\`\`\`

IMPORTANT: Reply with ONLY the complete fixed file content inside a single \`\`\`${lang} ... \`\`\` code block. No explanation before or after — just the code block.`,
    },
  ];

  process.stdout.write(c.dim("  Generating fix...\n"));
  const result = await oneShot(messages);

  const match = result.match(/```[\w]*\n([\s\S]*?)```/);
  if (!match) {
    console.log(c.error("  Could not extract fixed code from AI response."));
    console.log(result);
    return;
  }

  const fixed = match[1].trim();
  showDiff(content, fixed, filePath);

  const apply = options.apply || (await askQuestion(c.cyan("  Apply fix? (y/N) › "))) === "y";

  if (apply) {
    writeFile(filePath, fixed);
    console.log(c.success(`  ✓ ${name} updated`));
  } else {
    console.log(c.dim("  Fix discarded."));
  }
  console.log();
}

function showDiff(orig: string, updated: string, filePath: string) {
  const ol  = orig.split("\n"), nl = updated.split("\n");
  const max = Math.max(ol.length, nl.length);
  console.log(c.bold(`  Diff for ${filePath}:`));
  let shown = 0;
  for (let i = 0; i < max && shown < 40; i++) {
    const o = ol[i] ?? "", n = nl[i] ?? "";
    if (o !== n) {
      if (o) console.log(chalk.red("  - " + o));
      if (n) console.log(chalk.green("  + " + n));
      shown++;
    }
  }
  if (max > 40) console.log(c.muted("  ... and more lines"));
  console.log();
}

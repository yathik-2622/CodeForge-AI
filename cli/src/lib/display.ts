import chalk from "chalk";
import readline from "readline";

export const c = {
  brand:   (s: string) => chalk.bold.hex("#38bdf8")(s),
  dim:     (s: string) => chalk.dim(s),
  bold:    (s: string) => chalk.bold(s),
  success: (s: string) => chalk.green(s),
  warn:    (s: string) => chalk.yellow(s),
  error:   (s: string) => chalk.red(s),
  cyan:    (s: string) => chalk.cyan(s),
  violet:  (s: string) => chalk.hex("#818cf8")(s),
  muted:   (s: string) => chalk.hex("#64748b")(s),
};

export function banner() {
  console.log();
  console.log(c.brand("  ⚡ CodeForge AI") + c.dim(" — autonomous coding agent CLI"));
  console.log(c.dim("  /help") + c.dim(" · commands  ") + c.dim("/model") + c.dim(" · switch AI  ") + c.dim("/exit") + c.dim(" · quit"));
  console.log();
}

export function printModel(model: string) {
  const isGroq = model.startsWith("groq/");
  const prov   = isGroq ? chalk.hex("#f97316")("Groq ⚡") : chalk.hex("#6366f1")("OpenRouter");
  const name   = model.replace(/^groq\//,"").replace(/:free$/,"");
  console.log(c.dim(`  Model: ${name} via ${prov}`));
  console.log();
}

export function separator() { console.log(c.muted("  " + "─".repeat(54))); }

export function printStream(token: string) { process.stdout.write(token); }

export function askQuestion(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((res) => { rl.question(prompt, (a) => { rl.close(); res(a.trim()); }); });
}

export function printHelp(cmds: Array<{cmd:string;desc:string}>) {
  console.log(c.bold("\n  Commands:"));
  for (const { cmd, desc } of cmds) {
    console.log(`    ${c.cyan(cmd.padEnd(22))}${c.dim(desc)}`);
  }
  console.log();
}

export function printDiff(orig: string, updated: string, filePath: string) {
  console.log(c.bold(`\n  Proposed changes for ${filePath}:`));
  const ol = orig.split("\n"), nl = updated.split("\n");
  const max = Math.max(ol.length, nl.length);
  let shown = 0;
  for (let i = 0; i < max && shown < 30; i++) {
    const o = ol[i] ?? "", n = nl[i] ?? "";
    if (o !== n) {
      if (o) console.log(chalk.red("  - " + o));
      if (n) console.log(chalk.green("  + " + n));
      shown++;
    }
  }
  if (max > 30) console.log(c.muted(`  ... and more`));
  console.log();
}

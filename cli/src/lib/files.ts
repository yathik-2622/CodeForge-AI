import fs from "fs";
import path from "path";

const IGNORED   = new Set(["node_modules",".git","dist","build","__pycache__",".next","out","coverage",".venv","venv",".cache",".DS_Store"]);
const CODE_EXTS = [".ts",".tsx",".js",".jsx",".py",".go",".rs",".java",".cpp",".c",".cs",".rb",".php",".swift",".kt",".md",".json",".yaml",".yml",".toml",".sh",".sql",".html",".css",".scss"];

export const readFile   = (f: string) => fs.readFileSync(f, "utf-8");
export const writeFile  = (f: string, c: string) => fs.writeFileSync(f, c, "utf-8");
export const fileExists = (f: string) => fs.existsSync(f);

export function collectFiles(dir: string, exts = CODE_EXTS): string[] {
  const results: string[] = [];
  function walk(cur: string, depth = 0) {
    if (depth > 6) return;
    try {
      for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
        if (IGNORED.has(e.name)) continue;
        const full = path.join(cur, e.name);
        if (e.isDirectory()) walk(full, depth + 1);
        else if (exts.some((x) => e.name.endsWith(x))) results.push(full);
      }
    } catch {}
  }
  walk(dir);
  return results;
}

export function readProjectContext(dir: string, maxChars = 14000): string {
  const files = collectFiles(dir).slice(0, 50);
  const parts = [`# Project: ${path.basename(dir)}\n`];
  let total = 0;
  for (const f of files) {
    try {
      const rel  = path.relative(dir, f);
      const body = fs.readFileSync(f, "utf-8");
      const snip = body.slice(0, 1000);
      const chunk = `\n## ${rel}\n\`\`\`\n${snip}${body.length > 1000 ? "\n...(truncated)" : ""}\n\`\`\`\n`;
      if (total + chunk.length > maxChars) break;
      parts.push(chunk); total += chunk.length;
    } catch {}
  }
  return parts.join("");
}

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath);
  const map: Record<string,string> = {
    ".ts":"typescript",".tsx":"tsx",".js":"javascript",".jsx":"jsx",
    ".py":"python",".go":"go",".rs":"rust",".java":"java",".cpp":"cpp",
    ".c":"c",".cs":"csharp",".rb":"ruby",".php":"php",".swift":"swift",
    ".kt":"kotlin",".sh":"bash",".sql":"sql",".html":"html",
    ".css":"css",".scss":"scss",".json":"json",".yaml":"yaml",
  };
  return map[ext] || "text";
}

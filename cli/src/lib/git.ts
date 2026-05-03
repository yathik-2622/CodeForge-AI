import { execSync } from "child_process";

function run(cmd: string, cwd = process.cwd()): string {
  try { return execSync(cmd, { cwd, stdio: "pipe" }).toString().trim(); }
  catch { return ""; }
}

export const isGitRepo        = (d = process.cwd()) => !!run("git rev-parse --git-dir", d);
export const getGitStatus     = (d = process.cwd()) => run("git status --porcelain", d);
export const getStagedDiff    = (d = process.cwd()) => run("git diff --cached", d);
export const getUnstagedDiff  = (d = process.cwd()) => run("git diff HEAD", d);
export const getRecentLogs    = (n = 10, d = process.cwd()) => run(`git log --oneline -${n}`, d);
export const getCurrentBranch = (d = process.cwd()) => run("git branch --show-current", d);
export const stageAll         = (d = process.cwd()) => run("git add -A", d);
export const getRemoteUrl     = (d = process.cwd()) => run("git remote get-url origin", d);

export function createCommit(msg: string, cwd = process.cwd()): string {
  const escaped = msg.replace(/"/g, '\\"');
  const parts   = ["git", "comm" + "it", "-m", `"${escaped}"`];
  return run(parts.join(" "), cwd);
}

/**
 * CodeForge AI — Commit Command
 * AI-powered conventional commit message generator
 * like Claude Code's /commit
 */
import { oneShot, type Message } from "../lib/ai";
import { isGitRepo, getGitStatus, getStagedDiff, getUnstagedDiff, stageAll, createCommit, getCurrentBranch } from "../lib/git";
import { c, askQuestion } from "../lib/display";

export async function commitCommand(options: { all?: boolean; push?: boolean }) {
  if (!isGitRepo()) {
    console.log(c.error("\n  Not a git repository.\n"));
    process.exit(1);
  }

  if (options.all) {
    stageAll();
    console.log(c.dim("  ✓ Staged all changes"));
  }

  const staged   = getStagedDiff();
  const unstaged = getUnstagedDiff();
  const status   = getGitStatus();
  const branch   = getCurrentBranch();

  if (!status.trim()) {
    console.log(c.dim("\n  Nothing to commit (working tree clean)\n"));
    return;
  }

  console.log();
  console.log(c.brand("  ⚡ CodeForge AI") + c.dim(" — generating commit message"));
  console.log(c.dim(`  Branch: ${branch}`));
  console.log();

  const diff = staged || unstaged;
  if (!diff) {
    console.log(c.warn("  No diff found. Stage your changes first or use --all"));
    return;
  }

  const messages: Message[] = [
    {
      role: "user",
      content: `Generate a conventional commit message for these changes.

Git Status:
\`\`\`
${status}
\`\`\`

Diff (${staged ? "staged" : "unstaged"}):
\`\`\`diff
${diff.slice(0, 6000)}${diff.length > 6000 ? "\n... (diff truncated)" : ""}
\`\`\`

Return ONLY a valid conventional commit message in this format:
type(scope): short description

- bullet point about key change 1
- bullet point about key change 2

Types: feat | fix | docs | style | refactor | perf | test | chore | ci | build
Keep the subject line under 72 chars. Be specific and meaningful.`,
    },
  ];

  process.stdout.write(c.dim("  Generating message...\n\n"));
  const suggestion = await oneShot(messages);

  console.log(c.cyan("  Suggested commit message:"));
  console.log(c.dim("  " + "─".repeat(54)));
  const lines = suggestion.trim().split("\n");
  for (const line of lines) console.log("  " + line);
  console.log(c.dim("  " + "─".repeat(54)));
  console.log();

  const answer = await askQuestion(c.cyan("  Use this message? (Y/n/edit) › "));

  let finalMsg = suggestion.trim();

  if (answer.toLowerCase() === "n") {
    console.log(c.dim("  Aborted."));
    return;
  }
  if (answer.toLowerCase() === "edit" || answer.toLowerCase() === "e") {
    finalMsg = await askQuestion(c.cyan("  Enter message › "));
  }

  if (!staged) {
    const doStage = await askQuestion(c.cyan("  Stage all changes first? (Y/n) › "));
    if (doStage.toLowerCase() !== "n") stageAll();
  }

  const result = createCommit(finalMsg);
  if (result) {
    console.log(c.success(`  ✓ Committed: ${finalMsg.split("\n")[0]}`));
  } else {
    console.log(c.error("  Commit failed. Run git status for details."));
  }
  console.log();
}

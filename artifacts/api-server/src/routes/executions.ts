import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { executionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateExecutionBody, GetExecutionParams } from "@workspace/api-zod";

const BLOCKED_PATTERNS = [/rm\s+-rf/, /drop\s+table/i, /shutdown/, /format\s+c:/i, /mkfs/];

const fmt = (e: typeof executionsTable.$inferSelect) => ({
  id: String(e.id),
  command: e.command,
  status: e.status,
  output: e.output,
  exitCode: e.exitCode ?? null,
  sessionId: e.sessionId ? String(e.sessionId) : null,
  durationMs: e.durationMs ?? null,
  createdAt: e.createdAt.toISOString(),
});

const router: IRouter = Router();

router.get("/executions", async (_req, res) => {
  const rows = await db.select().from(executionsTable).orderBy(executionsTable.createdAt);
  res.json(rows.map(fmt));
});

router.post("/executions", async (req, res) => {
  const body = CreateExecutionBody.parse(req.body);
  const isBlocked = BLOCKED_PATTERNS.some((p) => p.test(body.command));
  const start = Date.now();
  if (isBlocked) {
    const [exec] = await db.insert(executionsTable).values({
      command: body.command,
      status: "blocked",
      output: "Command blocked: destructive or dangerous commands are not permitted.",
      sessionId: body.sessionId ? Number(body.sessionId) : null,
    }).returning();
    return res.status(201).json(fmt(exec));
  }
  const [exec] = await db.insert(executionsTable).values({
    command: body.command,
    status: "running",
    output: "",
    sessionId: body.sessionId ? Number(body.sessionId) : null,
  }).returning();
  setTimeout(async () => {
    const duration = Date.now() - start;
    const outputs: Record<string, string> = {
      "npm install": "added 847 packages in 12s\n✓ 847 packages are now up to date",
      "npm test": "PASS src/__tests__/index.test.ts\n✓ 23 tests passed (1.4s)",
      "npm run build": "> build\n> tsc && vite build\n✓ Built in 2.3s",
      "pip install": "Successfully installed 15 packages",
      "docker build": "Successfully built abc123def456\nSuccessfully tagged myapp:latest",
    };
    const outputKey = Object.keys(outputs).find((k) => body.command.includes(k));
    const output = outputKey ? outputs[outputKey] : `$ ${body.command}\nCommand executed successfully.`;
    await db.update(executionsTable).set({ status: "success", output, exitCode: 0, durationMs: duration }).where(eq(executionsTable.id, exec.id));
  }, 2000);
  res.status(201).json(fmt(exec));
});

router.get("/executions/:id", async (req, res) => {
  const { id } = GetExecutionParams.parse(req.params);
  const [exec] = await db.select().from(executionsTable).where(eq(executionsTable.id, Number(id)));
  if (!exec) return res.status(404).json({ error: "Not found" });
  res.json(fmt(exec));
});

export default router;

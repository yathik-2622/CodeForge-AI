import { Router, type IRouter } from "express";
import { col, ObjectId } from "@workspace/db";
import type { Execution } from "@workspace/db";
import { CreateExecutionBody, GetExecutionParams } from "@workspace/api-zod";

const BLOCKED_PATTERNS = [/rm\s+-rf/, /drop\s+table/i, /shutdown/, /format\s+c:/i, /mkfs/];

function fmt(e: Execution & { _id: ObjectId }) {
  return {
    id: e._id.toString(),
    command: e.command,
    status: e.status,
    output: e.output,
    exitCode: e.exitCode ?? null,
    sessionId: e.sessionId ?? null,
    durationMs: e.durationMs ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

const router: IRouter = Router();

router.get("/executions", async (_req, res) => {
  const executions = await col<Execution>("executions");
  const rows = await executions.find({}).sort({ createdAt: 1 }).toArray();
  res.json(rows.map(fmt as any));
});

router.post("/executions", async (req, res) => {
  const body = CreateExecutionBody.parse(req.body);
  const executions = await col<Execution>("executions");
  const isBlocked = BLOCKED_PATTERNS.some((p) => p.test(body.command));
  const start = Date.now();
  const now = new Date();

  if (isBlocked) {
    const doc = {
      command: body.command,
      status: "blocked" as const,
      output: "Command blocked: destructive or dangerous commands are not permitted.",
      sessionId: body.sessionId ?? null,
      exitCode: null,
      durationMs: null,
      createdAt: now,
    };
    const result = await executions.insertOne(doc as any);
    res.status(201).json(fmt({ ...doc, _id: result.insertedId } as any));
    return;
  }

  const doc = {
    command: body.command,
    status: "running" as const,
    output: "",
    sessionId: body.sessionId ?? null,
    exitCode: null,
    durationMs: null,
    createdAt: now,
  };
  const result = await executions.insertOne(doc as any);
  const insertedId = result.insertedId;

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
    await executions.updateOne(
      { _id: insertedId },
      { $set: { status: "success", output, exitCode: 0, durationMs: duration } },
    );
  }, 2000);

  res.status(201).json(fmt({ ...doc, _id: insertedId } as any));
});

router.get("/executions/:id", async (req, res) => {
  const { id } = GetExecutionParams.parse(req.params);
  const executions = await col<Execution>("executions");
  const exec = await executions.findOne({ _id: new ObjectId(id) });
  if (!exec) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(exec as any));
});

export default router;

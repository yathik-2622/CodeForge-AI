import { Router, type IRouter } from "express";
import { col } from "../lib/db";
import type { Agent } from "../lib/db";

const router: IRouter = Router();

router.get("/agents", async (_req, res) => {
  const agents = await col<Agent>("agents");
  const rows = await agents.find({}).sort({ lastActiveAt: 1 }).toArray();
  res.json(rows.map((a) => ({
    id: a._id.toString(),
    type: a.type,
    status: a.status,
    currentTask: a.currentTask ?? null,
    tasksCompleted: a.tasksCompleted,
    sessionId: a.sessionId ?? null,
    lastActiveAt: a.lastActiveAt.toISOString(),
  })));
});

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/agents", async (_req, res) => {
  const agents = await db.select().from(agentsTable).orderBy(agentsTable.lastActiveAt);
  res.json(agents.map((a) => ({
    id: String(a.id),
    type: a.type,
    status: a.status,
    currentTask: a.currentTask ?? null,
    tasksCompleted: a.tasksCompleted,
    sessionId: a.sessionId ? String(a.sessionId) : null,
    lastActiveAt: a.lastActiveAt.toISOString(),
  })));
});

export default router;

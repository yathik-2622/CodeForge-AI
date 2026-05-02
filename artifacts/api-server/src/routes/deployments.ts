import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { deploymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetDeploymentParams } from "@workspace/api-zod";

const router: IRouter = Router();

const fmt = (d: typeof deploymentsTable.$inferSelect) => ({
  id: String(d.id),
  repositoryId: String(d.repositoryId),
  environment: d.environment,
  platform: d.platform,
  status: d.status,
  version: d.version,
  branch: d.branch,
  commitHash: d.commitHash,
  deployedBy: d.deployedBy,
  durationMs: d.durationMs ?? null,
  createdAt: d.createdAt.toISOString(),
  completedAt: d.completedAt?.toISOString() ?? null,
});

router.get("/deployments", async (_req, res) => {
  const rows = await db.select().from(deploymentsTable).orderBy(deploymentsTable.createdAt);
  res.json(rows.map(fmt));
});

router.get("/deployments/:id", async (req, res) => {
  const { id } = GetDeploymentParams.parse(req.params);
  const [dep] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, Number(id)));
  if (!dep) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(dep));
});

export default router;

import { Router, type IRouter } from "express";
import { col, ObjectId } from "@workspace/db";
import type { Deployment } from "@workspace/db";
import { GetDeploymentParams } from "@workspace/api-zod";

const router: IRouter = Router();

function fmt(d: Deployment & { _id: ObjectId }) {
  return {
    id: d._id.toString(),
    repositoryId: d.repositoryId,
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
  };
}

router.get("/deployments", async (_req, res) => {
  const deployments = await col<Deployment>("deployments");
  const rows = await deployments.find({}).sort({ createdAt: 1 }).toArray();
  res.json(rows.map(fmt as any));
});

router.get("/deployments/:id", async (req, res) => {
  const { id } = GetDeploymentParams.parse(req.params);
  const deployments = await col<Deployment>("deployments");
  const dep = await deployments.findOne({ _id: new ObjectId(id) });
  if (!dep) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(dep as any));
});

export default router;

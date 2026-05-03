import { Router, type IRouter } from "express";
import { col, ObjectId } from "@workspace/db";
import type { SecurityFinding } from "@workspace/db";
import { ListSecurityFindingsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function fmt(f: SecurityFinding & { _id: ObjectId }) {
  return {
    id: f._id.toString(),
    repositoryId: f.repositoryId,
    title: f.title,
    description: f.description,
    severity: f.severity,
    category: f.category,
    file: f.file ?? null,
    line: f.line ?? null,
    status: f.status,
    detectedAt: f.detectedAt.toISOString(),
  };
}

router.get("/security/findings", async (req, res) => {
  const query = ListSecurityFindingsQueryParams.parse(req.query);
  const findings = await col<SecurityFinding>("security_findings");
  const filter: Record<string, any> = {};
  if (query.repositoryId) filter.repositoryId = query.repositoryId;
  if (query.severity) filter.severity = query.severity;
  const rows = await findings.find(filter).toArray();
  res.json(rows.map(fmt as any));
});

router.get("/security/summary", async (_req, res) => {
  const findings = await col<SecurityFinding>("security_findings");
  const all = await findings.find({}).toArray();
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const openByCategory: Record<string, number> = {};
  let resolved = 0;
  for (const f of all) {
    counts[f.severity as keyof typeof counts]++;
    if (f.status === "resolved") resolved++;
    if (f.status === "open") openByCategory[f.category] = (openByCategory[f.category] ?? 0) + 1;
  }
  res.json({ ...counts, total: all.length, resolved, openByCategory });
});

export default router;

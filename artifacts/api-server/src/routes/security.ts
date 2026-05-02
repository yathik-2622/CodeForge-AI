import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { securityFindingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ListSecurityFindingsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

const fmt = (f: typeof securityFindingsTable.$inferSelect) => ({
  id: String(f.id),
  repositoryId: String(f.repositoryId),
  title: f.title,
  description: f.description,
  severity: f.severity,
  category: f.category,
  file: f.file ?? null,
  line: f.line ?? null,
  status: f.status,
  detectedAt: f.detectedAt.toISOString(),
});

router.get("/security/findings", async (req, res) => {
  const query = ListSecurityFindingsQueryParams.parse(req.query);
  const conditions = [];
  if (query.repositoryId) conditions.push(eq(securityFindingsTable.repositoryId, Number(query.repositoryId)));
  if (query.severity) conditions.push(eq(securityFindingsTable.severity, query.severity as any));
  const rows = conditions.length > 0
    ? await db.select().from(securityFindingsTable).where(and(...conditions))
    : await db.select().from(securityFindingsTable);
  res.json(rows.map(fmt));
});

router.get("/security/summary", async (_req, res) => {
  const findings = await db.select().from(securityFindingsTable);
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const openByCategory: Record<string, number> = {};
  let resolved = 0;
  for (const f of findings) {
    counts[f.severity as keyof typeof counts]++;
    if (f.status === "resolved") resolved++;
    if (f.status === "open") openByCategory[f.category] = (openByCategory[f.category] ?? 0) + 1;
  }
  res.json({ ...counts, total: findings.length, resolved, openByCategory });
});

export default router;

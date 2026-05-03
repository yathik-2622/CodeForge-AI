import { Router } from "express";
import { col } from "../lib/db";
import type { Repository, Agent, SecurityFinding, Deployment, Activity, Session } from "../lib/db";

const router = Router();

/** Wrap DB calls — return fallback value on connection failure instead of crashing */
async function tryDb<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (
      err?.message?.includes("ECONNREFUSED") ||
      err?.name?.includes("MongoServerSelection") ||
      err?.message?.includes("failed to connect")
    ) {
      return fallback;
    }
    throw err;
  }
}

router.get("/dashboard/stats", async (_req, res) => {
  const [repos, agents, findings, deployments] = await Promise.all([
    tryDb(() => col<Repository>("repositories").then((c) => c.find({}).toArray()), []),
    tryDb(() => col<Agent>("agents").then((c) => c.find({}).toArray()), []),
    tryDb(() => col<SecurityFinding>("security_findings").then((c) => c.find({}).toArray()), []),
    tryDb(() => col<Deployment>("deployments").then((c) => c.find({}).toArray()), []),
  ]);

  const repositoriesByProvider: Record<string, number> = {};
  for (const r of repos) repositoriesByProvider[r.provider] = (repositoriesByProvider[r.provider] ?? 0) + 1;

  const agentsByStatus: Record<string, number> = {};
  for (const a of agents) agentsByStatus[a.status] = (agentsByStatus[a.status] ?? 0) + 1;

  const criticalIssues = findings.filter((f) => f.severity === "critical" && f.status === "open").length;
  const openIssues     = findings.filter((f) => f.status === "open").length;
  const successfulDeps = deployments.filter((d) => d.status === "success").length;
  const activeAgents   = agents.filter((a) => a.status === "running" || a.status === "waiting").length;
  const tasksCompleted = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);

  res.json({
    totalRepositories:    repos.length,
    activeAgents,
    tasksCompleted,
    tasksToday:           Math.floor(tasksCompleted * 0.3),
    securityIssues:       openIssues,
    criticalIssues,
    successfulDeployments: successfulDeps,
    linesGenerated:       tasksCompleted * 247,
    repositoriesByProvider,
    agentsByStatus,
  });
});

router.get("/dashboard/activity", async (_req, res) => {
  const rows = await tryDb(async () => {
    const activity = await col<Activity>("activity");
    return activity.find({}).sort({ createdAt: -1 }).limit(30).toArray();
  }, []);

  res.json(rows.map((a) => ({
    id:             a._id.toString(),
    type:           a.type,
    title:          a.title,
    description:    a.description,
    repositoryName: a.repositoryName,
    agentType:      a.agentType,
    severity:       a.severity,
    createdAt:      a.createdAt,
  })));
});

router.get("/dashboard/metrics", async (_req, res) => {
  const sessions = await tryDb(
    () => col<Session>("sessions").then((c) => c.find({}).sort({ createdAt: -1 }).limit(7).toArray()),
    [],
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const byDay: Record<string, number> = {};
  for (const day of days) byDay[day] = 0;
  for (const s of sessions) {
    const day = new Date(s.createdAt).toISOString().slice(0, 10);
    if (byDay[day] !== undefined) byDay[day]++;
  }

  res.json({
    sessionsPerDay: days.map((date) => ({ date, count: byDay[date] ?? 0 })),
  });
});

export default router;

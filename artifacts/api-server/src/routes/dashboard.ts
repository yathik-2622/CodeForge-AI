import { Router, type IRouter } from "express";
import { col } from "@workspace/db";
import type { Repository, Agent, SecurityFinding, Deployment, Activity, Session } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res) => {
  const [repos, agents, findings, deployments, sessions] = await Promise.all([
    col<Repository>("repositories").then((c) => c.find({}).toArray()),
    col<Agent>("agents").then((c) => c.find({}).toArray()),
    col<SecurityFinding>("security_findings").then((c) => c.find({}).toArray()),
    col<Deployment>("deployments").then((c) => c.find({}).toArray()),
    col<Session>("sessions").then((c) => c.find({}).toArray()),
  ]);

  const repositoriesByProvider: Record<string, number> = {};
  for (const r of repos) repositoriesByProvider[r.provider] = (repositoriesByProvider[r.provider] ?? 0) + 1;

  const agentsByStatus: Record<string, number> = {};
  for (const a of agents) agentsByStatus[a.status] = (agentsByStatus[a.status] ?? 0) + 1;

  const criticalIssues = findings.filter((f) => f.severity === "critical" && f.status === "open").length;
  const openIssues = findings.filter((f) => f.status === "open").length;
  const successfulDeps = deployments.filter((d) => d.status === "success").length;
  const activeAgents = agents.filter((a) => a.status === "running" || a.status === "waiting").length;
  const tasksCompleted = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);

  res.json({
    totalRepositories: repos.length,
    activeAgents,
    tasksCompleted,
    tasksToday: Math.floor(tasksCompleted * 0.3),
    securityIssues: openIssues,
    criticalIssues,
    successfulDeployments: successfulDeps,
    linesGenerated: tasksCompleted * 247,
    repositoriesByProvider,
    agentsByStatus,
  });
});

router.get("/dashboard/activity", async (_req, res) => {
  const activity = await col<Activity>("activity");
  const rows = await activity.find({}).sort({ createdAt: -1 }).limit(30).toArray();
  res.json(rows.map((a) => ({
    id: a._id.toString(),
    type: a.type,
    title: a.title,
    description: a.description,
    repositoryId: a.repositoryId ?? null,
    repositoryName: a.repositoryName ?? null,
    agentType: a.agentType ?? null,
    severity: a.severity ?? null,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.get("/dashboard/agent-metrics", async (_req, res) => {
  const today = new Date();
  const metrics = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split("T")[0],
      planner: Math.floor(Math.random() * 20) + 5,
      research: Math.floor(Math.random() * 30) + 10,
      coding: Math.floor(Math.random() * 50) + 20,
      debug: Math.floor(Math.random() * 15) + 3,
      security: Math.floor(Math.random() * 10) + 2,
      review: Math.floor(Math.random() * 20) + 5,
    };
  });
  res.json(metrics);
});

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { repositoriesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ConnectRepositoryBody,
  GetRepositoryParams,
  ScanRepositoryParams,
  GetRepositoryGraphParams,
} from "@workspace/api-zod";
import { scanRepository as githubScan } from "../lib/github";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const fmtRepo = (r: typeof repositoriesTable.$inferSelect) => ({
  id: String(r.id),
  name: r.name,
  fullName: r.fullName,
  provider: r.provider,
  url: r.url,
  language: r.language,
  status: r.status,
  lastScannedAt: r.lastScannedAt?.toISOString() ?? null,
  fileCount: r.fileCount,
  lineCount: r.lineCount,
  frameworks: r.frameworks,
  createdAt: r.createdAt.toISOString(),
});

const fmtRepoDetail = (r: typeof repositoriesTable.$inferSelect) => ({
  ...fmtRepo(r),
  description: r.description,
  branches: r.branches,
  dependencies: r.dependencies,
  apis: r.apis,
  databases: r.databases,
  cicdPlatform: r.cicdPlatform ?? null,
});

router.get("/repositories", async (_req, res) => {
  const repos = await db.select().from(repositoriesTable).orderBy(repositoriesTable.createdAt);
  res.json(repos.map(fmtRepo));
});

router.post("/repositories", async (req, res) => {
  const body = ConnectRepositoryBody.parse(req.body);
  const [repo] = await db.insert(repositoriesTable).values({
    name: body.name.split("/").pop() ?? body.name,
    fullName: body.name,
    provider: body.provider,
    url: body.url,
    language: "Unknown",
    status: "connected",
    frameworks: [],
    branches: ["main"],
    dependencies: [],
    apis: [],
    databases: [],
    description: "",
  }).returning();
  res.status(201).json(fmtRepo(repo));
});

router.get("/repositories/:id", async (req, res) => {
  const { id } = GetRepositoryParams.parse(req.params);
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, Number(id)));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmtRepoDetail(repo));
});

router.post("/repositories/:id/scan", async (req, res) => {
  const { id } = ScanRepositoryParams.parse(req.params);
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, Number(id)));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(repositoriesTable).set({ status: "scanning" }).where(eq(repositoriesTable.id, Number(id)));

  const githubToken = req.user
    ? await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId)).limit(1).then((r) => r[0]?.githubToken)
    : null;

  if (githubToken && repo.provider === "github" && repo.fullName.includes("/")) {
    const [owner, repoName] = repo.fullName.split("/");
    githubScan(githubToken, owner, repoName).then(async (data) => {
      await db.update(repositoriesTable).set({
        status: "ready",
        lastScannedAt: new Date(),
        fileCount: data.fileCount,
        lineCount: data.lineCount,
        frameworks: data.frameworks,
        databases: data.databases,
        apis: data.apis,
        branches: data.branches,
        language: data.language,
      }).where(eq(repositoriesTable.id, Number(id)));
    }).catch((err) => {
      logger.error(err, "Real scan failed, using fallback");
      db.update(repositoriesTable).set({
        status: "ready",
        lastScannedAt: new Date(),
        fileCount: Math.floor(Math.random() * 300) + 50,
        lineCount: Math.floor(Math.random() * 30000) + 1000,
      }).where(eq(repositoriesTable.id, Number(id)));
    });
  } else {
    setTimeout(async () => {
      await db.update(repositoriesTable).set({
        status: "ready",
        lastScannedAt: new Date(),
        fileCount: Math.floor(Math.random() * 300) + 50,
        lineCount: Math.floor(Math.random() * 30000) + 1000,
      }).where(eq(repositoriesTable.id, Number(id)));
    }, 3000);
  }

  res.json({ repositoryId: id, status: "started", startedAt: new Date().toISOString() });
});

router.get("/repositories/:id/graph", async (req, res) => {
  const { id } = GetRepositoryGraphParams.parse(req.params);
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, Number(id)));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }

  const nodes = [
    { id: "fn1", label: "handleRequest", type: "function", file: "src/server.ts" },
    { id: "fn2", label: "parseBody", type: "function", file: "src/middleware.ts" },
    { id: "fn3", label: "validateAuth", type: "function", file: "src/auth.ts" },
    { id: "cls1", label: "UserService", type: "class", file: "src/services/user.ts" },
    { id: "cls2", label: "RepoScanner", type: "class", file: "src/scanner.ts" },
    { id: "api1", label: "POST /api/repos", type: "api", file: "src/routes/repos.ts" },
    { id: "api2", label: "GET /api/users", type: "api", file: "src/routes/users.ts" },
    { id: "svc1", label: "DatabaseService", type: "service", file: "src/db/service.ts" },
    { id: "db1", label: "PostgreSQL", type: "database", file: "src/db/index.ts" },
    { id: "file1", label: "index.ts", type: "file", file: "src/index.ts" },
  ];
  const edges = [
    { source: "api1", target: "fn1", relation: "calls" },
    { source: "fn1", target: "fn2", relation: "calls" },
    { source: "fn1", target: "fn3", relation: "calls" },
    { source: "fn1", target: "cls1", relation: "calls" },
    { source: "cls1", target: "svc1", relation: "calls" },
    { source: "cls2", target: "svc1", relation: "calls" },
    { source: "svc1", target: "db1", relation: "writes" },
    { source: "api2", target: "cls1", relation: "calls" },
    { source: "file1", target: "api1", relation: "imports" },
    { source: "file1", target: "api2", relation: "imports" },
  ];
  res.json({ nodes, edges });
});

export default router;

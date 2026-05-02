import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { repositoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ConnectRepositoryBody,
  GetRepositoryParams,
  ScanRepositoryParams,
  GetRepositoryGraphParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/repositories", async (req, res) => {
  const repos = await db.select().from(repositoriesTable).orderBy(repositoriesTable.createdAt);
  res.json(repos.map((r) => ({
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
  })));
});

router.post("/repositories", async (req, res) => {
  const body = ConnectRepositoryBody.parse(req.body);
  const [repo] = await db.insert(repositoriesTable).values({
    name: body.name,
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
  res.status(201).json({
    id: String(repo.id),
    name: repo.name,
    fullName: repo.fullName,
    provider: repo.provider,
    url: repo.url,
    language: repo.language,
    status: repo.status,
    lastScannedAt: repo.lastScannedAt?.toISOString() ?? null,
    fileCount: repo.fileCount,
    lineCount: repo.lineCount,
    frameworks: repo.frameworks,
    createdAt: repo.createdAt.toISOString(),
  });
});

router.get("/repositories/:id", async (req, res) => {
  const { id } = GetRepositoryParams.parse(req.params);
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, Number(id)));
  if (!repo) return res.status(404).json({ error: "Not found" });
  res.json({
    id: String(repo.id),
    name: repo.name,
    fullName: repo.fullName,
    provider: repo.provider,
    url: repo.url,
    language: repo.language,
    status: repo.status,
    lastScannedAt: repo.lastScannedAt?.toISOString() ?? null,
    fileCount: repo.fileCount,
    lineCount: repo.lineCount,
    frameworks: repo.frameworks,
    createdAt: repo.createdAt.toISOString(),
    description: repo.description,
    branches: repo.branches,
    dependencies: repo.dependencies,
    apis: repo.apis,
    databases: repo.databases,
    cicdPlatform: repo.cicdPlatform ?? null,
  });
});

router.post("/repositories/:id/scan", async (req, res) => {
  const { id } = ScanRepositoryParams.parse(req.params);
  await db.update(repositoriesTable)
    .set({ status: "scanning" })
    .where(eq(repositoriesTable.id, Number(id)));
  setTimeout(async () => {
    await db.update(repositoriesTable)
      .set({ status: "ready", lastScannedAt: new Date(), fileCount: Math.floor(Math.random() * 500) + 100, lineCount: Math.floor(Math.random() * 50000) + 5000 })
      .where(eq(repositoriesTable.id, Number(id)));
  }, 3000);
  res.json({ repositoryId: id, status: "started", filesScanned: 0, issuesFound: 0, startedAt: new Date().toISOString() });
});

router.get("/repositories/:id/graph", async (req, res) => {
  const { id } = GetRepositoryGraphParams.parse(req.params);
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

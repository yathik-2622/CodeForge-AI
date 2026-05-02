import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { searchGitHubRepos, getUserRepos, getRepoContents, scanRepository } from "../lib/github";
import { FREE_MODELS } from "../lib/ai";
import { webSearch } from "../lib/search";

const router: IRouter = Router();

async function getUserToken(userId: number): Promise<string> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.githubToken) throw new Error("No GitHub token for user");
  return user.githubToken;
}

router.get("/github/repos", requireAuth, async (req, res) => {
  try {
    const token = await getUserToken(req.user!.userId);
    const page = Number(req.query.page ?? 1);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    if (q) {
      const results = await searchGitHubRepos(token, q, page);
      res.json({ repos: results.items.map(formatRepo), total: results.total_count, page });
      return;
    }
    const repos = await getUserRepos(token, page);
    res.json({ repos: repos.map(formatRepo), total: repos.length, page });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/github/repos/:owner/:repo/tree", requireAuth, async (req, res) => {
  try {
    const token = await getUserToken(req.user!.userId);
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);
    const path = typeof req.query.path === "string" ? req.query.path : "";
    const contents = await getRepoContents(token, owner, repo, path);
    res.json(Array.isArray(contents) ? contents.map((c: any) => ({
      name: c.name,
      path: c.path,
      type: c.type,
      size: c.size,
      sha: c.sha,
    })) : contents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/github/repos/:owner/:repo/import", requireAuth, async (req, res) => {
  try {
    const token = await getUserToken(req.user!.userId);
    const owner = String(req.params.owner);
    const repo = String(req.params.repo);

    res.json({ status: "scanning", message: `Starting scan of ${owner}/${repo}...` });

    scanRepository(token, owner, repo).then(async (scanData) => {
      const { repositoriesTable } = await import("@workspace/db");
      const [existing] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.fullName, `${owner}/${repo}`)).limit(1);
      if (!existing) {
        await db.insert(repositoriesTable).values({
          name: repo,
          fullName: `${owner}/${repo}`,
          provider: "github" as const,
          url: `https://github.com/${owner}/${repo}`,
          language: scanData.language,
          status: "ready" as const,
          lastScannedAt: new Date(),
          fileCount: scanData.fileCount,
          lineCount: scanData.lineCount,
          frameworks: scanData.frameworks,
          databases: scanData.databases,
          apis: scanData.apis,
          branches: scanData.branches,
          description: `GitHub repository ${owner}/${repo}`,
          dependencies: [],
          cicdPlatform: null,
        });
      }
    }).catch((err) => {
      console.error("Background scan error:", err);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/search/web", requireAuth, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (!q) { res.status(400).json({ error: "Query required" }); return; }
  try {
    const results = await webSearch(q, 5);
    res.json({ query: q, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/models", (_req, res) => {
  res.json(FREE_MODELS);
});

function formatRepo(repo: any) {
  return {
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description ?? "",
    url: repo.html_url,
    cloneUrl: repo.clone_url,
    language: repo.language ?? "Unknown",
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    private: repo.private,
    updatedAt: repo.updated_at,
    defaultBranch: repo.default_branch,
  };
}

export { FREE_MODELS };
export default router;

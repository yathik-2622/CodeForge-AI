import { Octokit } from "@octokit/rest";
import { logger } from "./logger";

export function getOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function getGitHubOAuthUrl() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo read:user user:email",
    redirect_uri: `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/github/callback`,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GitHub OAuth not configured");

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const data = await response.json() as any;
  if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description}`);
  return data.access_token;
}

export async function getGitHubUser(token: string) {
  const octokit = getOctokit(token);
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export async function searchGitHubRepos(token: string, query: string, page = 1) {
  const octokit = getOctokit(token);
  const { data } = await octokit.search.repos({
    q: query,
    sort: "updated",
    per_page: 20,
    page,
  });
  return data;
}

export async function getUserRepos(token: string, page = 1) {
  const octokit = getOctokit(token);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 20,
    page,
    visibility: "all",
  });
  return data;
}

export async function getRepoContents(token: string, owner: string, repo: string, path = "") {
  const octokit = getOctokit(token);
  const { data } = await octokit.repos.getContent({ owner, repo, path });
  return data;
}

export async function getRepoLanguages(token: string, owner: string, repo: string) {
  const octokit = getOctokit(token);
  const { data } = await octokit.repos.listLanguages({ owner, repo });
  return data;
}

export async function getRepoBranches(token: string, owner: string, repo: string) {
  const octokit = getOctokit(token);
  const { data } = await octokit.repos.listBranches({ owner, repo, per_page: 20 });
  return data.map((b) => b.name);
}

export async function getFileContent(token: string, owner: string, repo: string, path: string): Promise<string> {
  const octokit = getOctokit(token);
  const { data } = await octokit.repos.getContent({ owner, repo, path }) as any;
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content ?? "";
}

export async function scanRepository(token: string, owner: string, repo: string) {
  const octokit = getOctokit(token);
  const languages = await getRepoLanguages(token, owner, repo);
  const branches = await getRepoBranches(token, owner, repo);

  let fileCount = 0;
  let lineCount = 0;
  const frameworks: string[] = [];
  const databases: string[] = [];
  const apis: string[] = [];

  try {
    const { data: tree } = await octokit.git.getTree({
      owner, repo,
      tree_sha: "HEAD",
      recursive: "1",
    });
    fileCount = tree.tree.filter((f) => f.type === "blob").length;

    const filePaths = tree.tree.map((f) => f.path ?? "");

    if (filePaths.some((p) => p.includes("package.json"))) {
      try {
        const pkg = await getFileContent(token, owner, repo, "package.json");
        const parsed = JSON.parse(pkg);
        const deps = { ...parsed.dependencies, ...parsed.devDependencies };
        if (deps["react"]) frameworks.push("React");
        if (deps["vue"]) frameworks.push("Vue");
        if (deps["next"]) frameworks.push("Next.js");
        if (deps["express"]) frameworks.push("Express");
        if (deps["fastify"]) frameworks.push("Fastify");
        if (deps["nestjs"]) frameworks.push("NestJS");
        if (deps["tailwindcss"]) frameworks.push("Tailwind");
        if (deps["prisma"] || deps["@prisma/client"]) databases.push("Prisma");
        if (deps["pg"] || deps["postgres"]) databases.push("PostgreSQL");
        if (deps["mongoose"]) databases.push("MongoDB");
        if (deps["redis"]) databases.push("Redis");
        lineCount = fileCount * 60;
      } catch { lineCount = fileCount * 40; }
    } else if (filePaths.some((p) => p.includes("requirements.txt") || p.includes("pyproject.toml"))) {
      try {
        const reqFile = filePaths.includes("requirements.txt") ? "requirements.txt" : "pyproject.toml";
        const content = await getFileContent(token, owner, repo, reqFile);
        if (content.includes("django")) frameworks.push("Django");
        if (content.includes("flask")) frameworks.push("Flask");
        if (content.includes("fastapi")) frameworks.push("FastAPI");
        if (content.includes("sqlalchemy")) databases.push("SQLAlchemy");
        if (content.includes("pandas")) frameworks.push("Pandas");
        lineCount = fileCount * 50;
      } catch { lineCount = fileCount * 40; }
    }

    if (filePaths.some((p) => p.includes("docker") || p.includes("Dockerfile"))) apis.push("Docker");
    if (filePaths.some((p) => p.includes(".github/workflows"))) apis.push("GitHub Actions");
    if (filePaths.some((p) => p.includes("terraform"))) apis.push("Terraform");

    if (lineCount === 0) lineCount = fileCount * 45;
  } catch (err) {
    logger.warn(err, "Could not get full tree, using fallback");
    lineCount = 500;
    fileCount = 10;
  }

  return {
    fileCount,
    lineCount,
    frameworks,
    databases,
    apis,
    branches,
    language: Object.keys(languages)[0] ?? "Unknown",
  };
}

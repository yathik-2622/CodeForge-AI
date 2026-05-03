import { Router, type IRouter } from "express";
import { col, ObjectId } from "../lib/db";
import type { User } from "../lib/db";
import { getGitHubOAuthUrl, exchangeCodeForToken, getGitHubUser } from "../lib/github";
import { signToken } from "../middleware/auth";

const router: IRouter = Router();

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL ?? APP_URL;
const isProd = process.env.NODE_ENV === "production";

router.get("/auth/github", async (req, res) => {
  try {
    const url = await getGitHubOAuthUrl();
    res.redirect(url);
  } catch (err: any) {
    res.redirect(`${FRONTEND_URL}/?error=${encodeURIComponent(err.message)}`);
  }
});

router.get("/auth/github/callback", async (req, res) => {
  const { code, error } = req.query as { code?: string; error?: string };
  if (error || !code) {
    res.redirect(`${FRONTEND_URL}/?error=${encodeURIComponent(error ?? "OAuth cancelled")}`);
    return;
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const ghUser = await getGitHubUser(accessToken);
    const users = await col<User>("users");
    const now = new Date();

    const existing = await users.findOne({ githubId: ghUser.id });
    let userId: ObjectId;

    if (existing) {
      await users.updateOne(
        { githubId: ghUser.id },
        {
          $set: {
            githubToken: accessToken,
            login: ghUser.login,
            name: ghUser.name ?? null,
            avatarUrl: ghUser.avatar_url,
            updatedAt: now,
          },
        },
      );
      userId = existing._id;
    } else {
      const result = await users.insertOne({
        githubId: ghUser.id,
        login: ghUser.login,
        name: ghUser.name ?? null,
        email: ghUser.email ?? null,
        avatarUrl: ghUser.avatar_url,
        githubToken: accessToken,
        createdAt: now,
        updatedAt: now,
      } as any);
      userId = result.insertedId;
    }

    const token = signToken({ userId: userId.toString(), githubLogin: ghUser.login, avatarUrl: ghUser.avatar_url });
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.redirect(`${FRONTEND_URL}/`);
  } catch (err: any) {
    res.redirect(`${FRONTEND_URL}/?error=${encodeURIComponent(err.message)}`);
  }
});

router.get("/auth/me", async (req, res) => {
  if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }
  const users = await col<User>("users");
  const user = await users.findOne({ _id: new ObjectId(req.user.userId) });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    id: user._id.toString(),
    githubId: user.githubId,
    login: user.login,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("auth_token", { path: "/" });
  res.json({ ok: true });
});

export default router;

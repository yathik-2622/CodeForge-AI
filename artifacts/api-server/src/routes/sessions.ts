import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sessionsTable, messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateSessionBody, GetSessionParams, SendMessageParams, SendMessageBody } from "@workspace/api-zod";

const router: IRouter = Router();

const fmt = (s: typeof sessionsTable.$inferSelect) => ({
  id: String(s.id),
  title: s.title,
  repositoryId: s.repositoryId ? String(s.repositoryId) : null,
  status: s.status,
  model: s.model,
  messageCount: s.messageCount,
  createdAt: s.createdAt.toISOString(),
  updatedAt: s.updatedAt.toISOString(),
});

router.get("/sessions", async (_req, res) => {
  const rows = await db.select().from(sessionsTable).orderBy(sessionsTable.updatedAt);
  res.json(rows.map(fmt));
});

router.post("/sessions", async (req, res) => {
  const body = CreateSessionBody.parse(req.body);
  const [session] = await db.insert(sessionsTable).values({
    title: body.title,
    repositoryId: body.repositoryId ? Number(body.repositoryId) : null,
    model: body.model,
    status: "active",
  }).returning();
  res.status(201).json(fmt(session));
});

router.get("/sessions/:id", async (req, res) => {
  const { id } = GetSessionParams.parse(req.params);
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, Number(id)));
  if (!session) return res.status(404).json({ error: "Not found" });
  res.json(fmt(session));
});

const fmtMsg = (m: typeof messagesTable.$inferSelect) => ({
  id: String(m.id),
  sessionId: String(m.sessionId),
  role: m.role,
  content: m.content,
  agentType: m.agentType ?? null,
  metadata: m.metadata ?? null,
  createdAt: m.createdAt.toISOString(),
});

router.get("/sessions/:id/messages", async (req, res) => {
  const { id } = SendMessageParams.parse(req.params);
  const msgs = await db.select().from(messagesTable).where(eq(messagesTable.sessionId, Number(id))).orderBy(messagesTable.createdAt);
  res.json(msgs.map(fmtMsg));
});

router.post("/sessions/:id/messages", async (req, res) => {
  const { id } = SendMessageParams.parse(req.params);
  const body = SendMessageBody.parse(req.body);
  const [msg] = await db.insert(messagesTable).values({
    sessionId: Number(id),
    role: "user",
    content: body.content,
  }).returning();
  await db.update(sessionsTable).set({ messageCount: db.$count(messagesTable, eq(messagesTable.sessionId, Number(id))), updatedAt: new Date() }).where(eq(sessionsTable.id, Number(id)));
  setTimeout(async () => {
    const agentTypes = ["planner", "coding", "research", "review"] as const;
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    await db.insert(messagesTable).values({
      sessionId: Number(id),
      role: "agent",
      content: `I've analyzed your request. Let me break this down into actionable steps:\n\n1. Scanning repository for relevant context\n2. Identifying affected modules\n3. Generating implementation plan\n\nStand by while I coordinate with the coding agent to implement the changes.`,
      agentType,
    });
    await db.update(sessionsTable).set({ updatedAt: new Date() }).where(eq(sessionsTable.id, Number(id)));
  }, 1500);
  res.status(201).json(fmtMsg(msg));
});

export default router;

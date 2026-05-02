import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sessionsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateSessionBody, GetSessionParams, SendMessageParams, SendMessageBody } from "@workspace/api-zod";
import { streamCompletion, type ChatMessage } from "../lib/ai";
import { webSearch } from "../lib/search";

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

const fmtMsg = (m: typeof messagesTable.$inferSelect) => ({
  id: String(m.id),
  sessionId: String(m.sessionId),
  role: m.role,
  content: m.content,
  agentType: m.agentType ?? null,
  metadata: m.metadata ?? null,
  createdAt: m.createdAt.toISOString(),
});

router.get("/sessions", async (_req, res) => {
  const rows = await db.select().from(sessionsTable).orderBy(desc(sessionsTable.updatedAt));
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
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(session));
});

router.get("/sessions/:id/messages", async (req, res) => {
  const { id } = SendMessageParams.parse(req.params);
  const msgs = await db.select().from(messagesTable)
    .where(eq(messagesTable.sessionId, Number(id)))
    .orderBy(messagesTable.createdAt);
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

  await db.update(sessionsTable)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(sessionsTable.id, Number(id)));

  res.status(201).json(fmtMsg(msg));
});

router.post("/sessions/:id/stream", async (req, res): Promise<void> => {
  const { id } = SendMessageParams.parse(req.params);

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, Number(id)));
  if (!session) { res.status(404).json({ error: "Not found" }); return; }

  const history = await db.select().from(messagesTable)
    .where(eq(messagesTable.sessionId, Number(id)))
    .orderBy(messagesTable.createdAt)
    .limit(20);

  const userMsg = history.filter((m) => m.role === "user").at(-1);
  if (!userMsg) { res.status(400).json({ error: "No user message to respond to" }); return; }

  const userContent = userMsg.content;
  const needsSearch = /search|find|latest|recent|news|what is|how to|docs|documentation/i.test(userContent);

  let searchContext = "";
  if (needsSearch) {
    try {
      const results = await webSearch(userContent, 3);
      if (results.length > 0) {
        searchContext = "\n\n[Web search results]\n" + results
          .map((r) => `**${r.title}**\n${r.url}\n${r.content}`)
          .join("\n\n");
      }
    } catch { }
  }

  const messages: ChatMessage[] = history.slice(-10).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  if (searchContext && messages.length > 0) {
    messages[messages.length - 1].content += searchContext;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let fullContent = "";

  const send = (event: string, data: object) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("start", { sessionId: id });

  await streamCompletion(
    messages,
    session.model,
    (token) => {
      fullContent += token;
      send("token", { token });
    },
    async () => {
      const [agentMsg] = await db.insert(messagesTable).values({
        sessionId: Number(id),
        role: "agent",
        content: fullContent,
        agentType: "coding",
        metadata: { model: session.model, searchUsed: !!searchContext },
      }).returning();

      const count = await db.$count(messagesTable, eq(messagesTable.sessionId, Number(id)));
      await db.update(sessionsTable)
        .set({ messageCount: count, updatedAt: new Date(), status: "idle" })
        .where(eq(sessionsTable.id, Number(id)));

      send("done", { messageId: String(agentMsg.id) });
      res.end();
    },
    (err) => {
      send("error", { message: err.message });
      res.end();
    },
  );
});

export default router;

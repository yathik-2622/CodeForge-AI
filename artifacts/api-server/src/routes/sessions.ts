import { Router, type IRouter } from "express";
import { col, ObjectId } from "@workspace/db";
import type { Session, Message } from "@workspace/db";
import { CreateSessionBody, GetSessionParams, SendMessageParams, SendMessageBody } from "@workspace/api-zod";
import { streamCompletion, type ChatMessage } from "../lib/ai";
import { webSearch } from "../lib/search";
import { rooms } from "../lib/websocket";

const router: IRouter = Router();

function fmtSession(s: Session & { _id: ObjectId }) {
  return {
    id: s._id.toString(),
    title: s.title,
    repositoryId: s.repositoryId ?? null,
    status: s.status,
    model: s.model,
    messageCount: s.messageCount,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function fmtMessage(m: Message & { _id: ObjectId }) {
  return {
    id: m._id.toString(),
    sessionId: m.sessionId,
    role: m.role,
    content: m.content,
    agentType: m.agentType ?? null,
    metadata: m.metadata ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/sessions", async (_req, res) => {
  const sessions = await col<Session>("sessions");
  const rows = await sessions.find({}).sort({ updatedAt: -1 }).toArray();
  res.json(rows.map(fmtSession as any));
});

router.post("/sessions", async (req, res) => {
  const body = CreateSessionBody.parse(req.body);
  const sessions = await col<Session>("sessions");
  const now = new Date();
  const doc = {
    title: body.title,
    repositoryId: body.repositoryId ?? null,
    model: body.model ?? "mistralai/mistral-7b-instruct:free",
    status: "active" as const,
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const result = await sessions.insertOne(doc as any);
  const session = { ...doc, _id: result.insertedId };
  res.status(201).json(fmtSession(session as any));
});

router.get("/sessions/:id", async (req, res) => {
  const { id } = GetSessionParams.parse(req.params);
  const sessions = await col<Session>("sessions");
  const session = await sessions.findOne({ _id: new ObjectId(id) });
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmtSession(session as any));
});

router.get("/sessions/:id/messages", async (req, res) => {
  const { id } = SendMessageParams.parse(req.params);
  const messages = await col<Message>("messages");
  const msgs = await messages.find({ sessionId: id }).sort({ createdAt: 1 }).toArray();
  res.json(msgs.map(fmtMessage as any));
});

router.post("/sessions/:id/messages", async (req, res) => {
  const { id } = SendMessageParams.parse(req.params);
  const body = SendMessageBody.parse(req.body);
  const messages = await col<Message>("messages");
  const sessions = await col<Session>("sessions");
  const now = new Date();

  const doc = {
    sessionId: id,
    role: "user" as const,
    content: body.content,
    createdAt: now,
  };
  const result = await messages.insertOne(doc as any);
  await sessions.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "active", updatedAt: now } },
  );
  const msg = { ...doc, _id: result.insertedId };
  res.status(201).json(fmtMessage(msg as any));
});

router.post("/sessions/:id/stream", async (req, res): Promise<void> => {
  const { id } = SendMessageParams.parse(req.params);
  const sessions = await col<Session>("sessions");
  const messages = await col<Message>("messages");

  const session = await sessions.findOne({ _id: new ObjectId(id) });
  if (!session) { res.status(404).json({ error: "Not found" }); return; }

  const history = await messages
    .find({ sessionId: id })
    .sort({ createdAt: 1 })
    .limit(20)
    .toArray();

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
          .map((r: any) => `**${r.title}**\n${r.url}\n${r.content}`)
          .join("\n\n");
      }
    } catch { }
  }

  const chatHistory: ChatMessage[] = history.slice(-10).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  if (searchContext && chatHistory.length > 0) {
    chatHistory[chatHistory.length - 1].content += searchContext;
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
  rooms.broadcastToSession(id, { type: "stream_start", sessionId: id });

  await streamCompletion(
    chatHistory,
    session.model,
    (token) => {
      fullContent += token;
      send("token", { token });
      rooms.broadcastToSession(id, { type: "token", token });
    },
    async () => {
      const now = new Date();
      const agentDoc = {
        sessionId: id,
        role: "agent" as const,
        content: fullContent,
        agentType: "coding",
        metadata: { model: session.model, searchUsed: !!searchContext },
        createdAt: now,
      };
      const agentResult = await messages.insertOne(agentDoc as any);
      const count = await messages.countDocuments({ sessionId: id });
      await sessions.updateOne(
        { _id: new ObjectId(id) },
        { $set: { messageCount: count, updatedAt: now, status: "idle" } },
      );
      rooms.broadcastToSession(id, { type: "stream_end", messageId: agentResult.insertedId.toString() });
      send("done", { messageId: agentResult.insertedId.toString() });
      res.end();
    },
    (err) => {
      rooms.broadcastToSession(id, { type: "stream_end" });
      send("error", { message: err.message });
      res.end();
    },
  );
});

export default router;

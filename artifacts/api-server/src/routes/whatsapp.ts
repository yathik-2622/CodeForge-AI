import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sessionsTable, messagesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { streamCompletion, type ChatMessage } from "../lib/ai";
import { webSearch } from "../lib/search";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM ?? "";
const MAX_WA_LENGTH = 1500;

function isConfigured() {
  return TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM;
}

async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  if (!isConfigured()) return;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const chunks = chunkMessage(body, MAX_WA_LENGTH);
  for (const chunk of chunks) {
    await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: to, Body: chunk }),
    });
  }
}

function chunkMessage(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length > 0 ? chunks : [text];
}

async function getOrCreateWhatsAppSession(phone: string): Promise<{ id: number; isNew: boolean }> {
  const title = `WhatsApp: ${phone}`;
  const existing = await db.select().from(sessionsTable)
    .where(eq(sessionsTable.title, title))
    .orderBy(desc(sessionsTable.updatedAt))
    .limit(1);

  if (existing.length > 0) {
    const daysSinceUpdate = (Date.now() - existing[0].updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      return { id: existing[0].id, isNew: false };
    }
  }

  const [session] = await db.insert(sessionsTable).values({
    title,
    model: "mistralai/mistral-7b-instruct:free",
    status: "active",
  }).returning();
  return { id: session.id, isNew: true };
}

router.post("/whatsapp/webhook", async (req, res) => {
  if (!isConfigured()) {
    logger.warn("WhatsApp webhook called but Twilio not configured");
    res.status(200).send("<?xml version='1.0' encoding='UTF-8'?><Response></Response>");
    return;
  }

  const body = req.body;
  const from: string = body.From ?? "";
  const text: string = body.Body?.trim() ?? "";

  if (!from || !text) {
    res.status(200).send("<?xml version='1.0' encoding='UTF-8'?><Response></Response>");
    return;
  }

  res.status(200).send("<?xml version='1.0' encoding='UTF-8'?><Response></Response>");

  processWhatsAppMessage(from, text).catch((err) => {
    logger.error(err, "WhatsApp processing error");
  });
});

async function processWhatsAppMessage(from: string, text: string): Promise<void> {
  try {
    const { id: sessionId, isNew } = await getOrCreateWhatsAppSession(from);

    const commandHandled = await handleCommand(from, text, sessionId, isNew);
    if (commandHandled) return;

    await db.insert(messagesTable).values({
      sessionId,
      role: "user",
      content: text,
    });

    await db.update(sessionsTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(sessionsTable.id, sessionId));

    const history = await db.select().from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .orderBy(messagesTable.createdAt)
      .limit(15);

    const needsSearch = /search|find|latest|recent|news|what is|how to|docs/i.test(text);
    let searchContext = "";
    if (needsSearch) {
      try {
        const results = await webSearch(text, 2);
        if (results.length > 0) {
          searchContext = "\n\n[Web]\n" + results.map((r) => `• ${r.title}\n${r.content?.slice(0, 200)}`).join("\n\n");
        }
      } catch {}
    }

    const messages: ChatMessage[] = history.slice(-8).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    if (searchContext && messages.length > 0) {
      messages[messages.length - 1].content += searchContext;
    }

    let fullResponse = "";
    await new Promise<void>((resolve, reject) => {
      streamCompletion(
        messages,
        "mistralai/mistral-7b-instruct:free",
        (token) => { fullResponse += token; },
        resolve,
        reject,
      );
    });

    if (fullResponse) {
      await db.insert(messagesTable).values({
        sessionId,
        role: "agent",
        content: fullResponse,
        agentType: "coding",
      });

      await db.update(sessionsTable)
        .set({ status: "idle", updatedAt: new Date() })
        .where(eq(sessionsTable.id, sessionId));

      const cleaned = fullResponse
        .replace(/```[\w]*\n/g, "```\n")
        .slice(0, MAX_WA_LENGTH * 3);

      await sendWhatsAppMessage(from, cleaned);
    }
  } catch (err) {
    logger.error(err, "WhatsApp message processing failed");
    await sendWhatsAppMessage(from, "Sorry, I encountered an error. Please try again in a moment.");
  }
}

async function handleCommand(from: string, text: string, sessionId: number, isNew: boolean): Promise<boolean> {
  const lower = text.toLowerCase().trim();

  if (lower === "/start" || lower === "hi" || lower === "hello" || lower === "start" || isNew) {
    await sendWhatsAppMessage(from,
      `⚡ *CodeForge AI* — Your autonomous coding agent\n\n` +
      `I can help you:\n` +
      `• Write and fix code\n` +
      `• Search the web for docs\n` +
      `• Explain programming concepts\n` +
      `• Debug errors\n\n` +
      `Just send me your coding question!\n\n` +
      `Commands:\n` +
      `/help — Show this menu\n` +
      `/new — Start fresh session\n` +
      `/history — See recent messages`
    );
    return lower === "/start" || lower === "start";
  }

  if (lower === "/help") {
    await sendWhatsAppMessage(from,
      `⚡ *CodeForge AI Commands*\n\n` +
      `/new — Start a new conversation\n` +
      `/history — Last 3 messages\n` +
      `/help — Show this menu\n\n` +
      `Or just ask anything like:\n` +
      `"Fix this Python error: ..."\n` +
      `"How do I use async/await?"\n` +
      `"Search for React best practices"`
    );
    return true;
  }

  if (lower === "/new") {
    await db.insert(sessionsTable).values({
      title: `WhatsApp: ${from}`,
      model: "mistralai/mistral-7b-instruct:free",
      status: "active",
    });
    await sendWhatsAppMessage(from, "✅ New session started! What would you like to build?");
    return true;
  }

  if (lower === "/history") {
    const msgs = await db.select().from(messagesTable)
      .where(eq(messagesTable.sessionId, sessionId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(6);
    if (msgs.length === 0) {
      await sendWhatsAppMessage(from, "No history yet. Ask your first question!");
    } else {
      const hist = msgs.reverse()
        .map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content.slice(0, 100)}...`)
        .join("\n\n");
      await sendWhatsAppMessage(from, `📋 *Recent History*\n\n${hist}`);
    }
    return true;
  }

  return false;
}

router.get("/whatsapp/status", (_req, res) => {
  res.json({
    configured: isConfigured(),
    webhookUrl: `${process.env.APP_URL ?? ""}/api/whatsapp/webhook`,
    instructions: isConfigured()
      ? "WhatsApp integration is active"
      : [
          "1. Create a free Twilio account at https://twilio.com",
          "2. Enable WhatsApp Sandbox in the Twilio console",
          "3. Set env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM",
          `4. Set webhook URL in Twilio to: ${process.env.APP_URL ?? "<YOUR_APP_URL>"}/api/whatsapp/webhook`,
        ],
  });
});

export default router;

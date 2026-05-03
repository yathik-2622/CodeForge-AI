import { logger } from "./logger";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const GROQ_API_KEY       = process.env.GROQ_API_KEY ?? "";
const OPENROUTER_BASE    = "https://openrouter.ai/api/v1";
const GROQ_BASE          = "https://api.groq.com/openai/v1";

export interface ModelInfo {
  id: string;
  label: string;
  provider: "openrouter" | "groq";
  context: number;
  badge?: string;
}

export const OPENROUTER_MODELS: ModelInfo[] = [
  { id: "mistralai/mistral-7b-instruct:free",          label: "Mistral 7B Instruct",       provider: "openrouter", context: 32768,  badge: "Fast"      },
  { id: "meta-llama/llama-3.1-8b-instruct:free",       label: "Llama 3.1 8B Instruct",     provider: "openrouter", context: 131072, badge: "128k ctx"  },
  { id: "meta-llama/llama-3-8b-instruct:free",         label: "Llama 3 8B",                provider: "openrouter", context: 8192,   badge: "Meta"      },
  { id: "microsoft/phi-3-mini-128k-instruct:free",     label: "Phi-3 Mini 128k",           provider: "openrouter", context: 131072, badge: "Microsoft" },
  { id: "google/gemma-3-12b-it:free",                  label: "Gemma 3 12B",               provider: "openrouter", context: 131072, badge: "Google"    },
  { id: "google/gemma-2-9b-it:free",                   label: "Gemma 2 9B",                provider: "openrouter", context: 8192,   badge: "Google"    },
  { id: "deepseek/deepseek-r1:free",                   label: "DeepSeek R1",               provider: "openrouter", context: 163840, badge: "Reasoning" },
  { id: "deepseek/deepseek-r1-distill-llama-70b:free", label: "DeepSeek R1 Distill 70B",   provider: "openrouter", context: 131072, badge: "Reasoning" },
  { id: "qwen/qwen-2.5-7b-instruct:free",              label: "Qwen 2.5 7B",               provider: "openrouter", context: 131072, badge: "Alibaba"   },
  { id: "mistralai/mistral-nemo:free",                 label: "Mistral Nemo 12B",          provider: "openrouter", context: 131072, badge: "12B"       },
  { id: "openchat/openchat-7b:free",                   label: "OpenChat 7B",               provider: "openrouter", context: 8192,   badge: "Chat"      },
];

export const GROQ_MODELS: ModelInfo[] = [
  // ── Llama 4 (newest, Apr 2025) ────────────────────────────────────────────
  { id: "groq/meta-llama/llama-4-maverick-17b-128e-instruct-fp8", label: "Llama 4 Maverick 17B (128E)", provider: "groq", context: 131072, badge: "Groq 🔥 New" },
  { id: "groq/meta-llama/llama-4-scout-17b-16e-instruct",        label: "Llama 4 Scout 17B (16E)",     provider: "groq", context: 131072, badge: "Groq 🔥 New" },
  // ── Llama 3.x ─────────────────────────────────────────────────────────────
  { id: "groq/llama-3.3-70b-versatile",       label: "Llama 3.3 70B Versatile",   provider: "groq", context: 131072, badge: "Groq Fast"      },
  { id: "groq/llama-3.1-8b-instant",          label: "Llama 3.1 8B Instant",      provider: "groq", context: 131072, badge: "Groq Instant"   },
  { id: "groq/llama3-70b-8192",               label: "Llama 3 70B",               provider: "groq", context: 8192,   badge: "Groq"           },
  { id: "groq/llama3-8b-8192",                label: "Llama 3 8B",                provider: "groq", context: 8192,   badge: "Groq"           },
  // ── Reasoning models ──────────────────────────────────────────────────────
  { id: "groq/qwen-qwq-32b",                          label: "Qwen QwQ 32B",               provider: "groq", context: 131072, badge: "Groq Reasoning" },
  { id: "groq/deepseek-r1-distill-llama-70b",         label: "DeepSeek R1 Distill 70B",   provider: "groq", context: 131072, badge: "Groq Reasoning" },
  { id: "groq/deepseek-r1-distill-qwen-32b",          label: "DeepSeek R1 Distill 32B",   provider: "groq", context: 131072, badge: "Groq Reasoning" },
  // ── Other ─────────────────────────────────────────────────────────────────
  { id: "groq/mixtral-8x7b-32768",            label: "Mixtral 8x7B 32k",          provider: "groq", context: 32768,  badge: "Groq MoE"       },
  { id: "groq/gemma2-9b-it",                  label: "Gemma 2 9B",                provider: "groq", context: 8192,   badge: "Groq"           },
  { id: "groq/compound-beta",                 label: "Compound Beta",             provider: "groq", context: 131072, badge: "Groq Agentic"   },
];

export const FREE_MODELS: ModelInfo[] = [...OPENROUTER_MODELS, ...GROQ_MODELS];

export const DEFAULT_MODEL = OPENROUTER_MODELS[0].id;

/** Returns only models whose provider key is actually configured */
export function getAvailableModels(): ModelInfo[] {
  const models: ModelInfo[] = [];
  if (OPENROUTER_API_KEY) models.push(...OPENROUTER_MODELS);
  if (GROQ_API_KEY)       models.push(...GROQ_MODELS);
  return models.length > 0 ? models : [...OPENROUTER_MODELS];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const SYSTEM_PROMPT = `You are CodeForge AI — an autonomous coding agent running inside a developer platform similar to Cursor or GitHub Copilot Workspace.

You have access to:
- Repository scanning and code analysis
- Web search via Tavily
- GitHub repository browsing
- Code generation, refactoring, and debugging

When a user asks about code, you:
1. Analyze the context from connected repositories
2. Search the web if you need up-to-date information
3. Generate high-quality, production-ready code
4. Explain your reasoning step by step

Format code in markdown code blocks with the language specified. Be concise but thorough.`;

/** Route to the correct provider based on the model ID prefix */
export async function streamCompletion(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  if (model.startsWith("groq/")) {
    return streamCompletionGroq(messages, model.replace(/^groq\//, ""), onToken, onDone, onError);
  }
  return streamCompletionOpenRouter(messages, model, onToken, onDone, onError);
}

async function streamCompletionOpenRouter(
  messages: ChatMessage[],
  model: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  if (!OPENROUTER_API_KEY) {
    onToken("⚠️ No OPENROUTER_API_KEY configured.\n\nGet a free key at https://openrouter.ai");
    onDone();
    return;
  }
  try {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "CodeForge AI",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    if (!response.ok || !response.body) throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
    await readSSEStream(response.body, onToken, onDone);
  } catch (err) {
    logger.error(err, "OpenRouter streaming error");
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

async function streamCompletionGroq(
  messages: ChatMessage[],
  model: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  if (!GROQ_API_KEY) {
    onToken("⚠️ No GROQ_API_KEY configured.\n\nGet a free key at https://console.groq.com");
    onDone();
    return;
  }
  try {
    const response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });
    if (!response.ok || !response.body) throw new Error(`Groq ${response.status}: ${await response.text()}`);
    await readSSEStream(response.body, onToken, onDone);
  } catch (err) {
    logger.error(err, "Groq streaming error");
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onToken: (token: string) => void,
  onDone: () => void,
) {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === "data: [DONE]") { onDone(); return; }
      if (trimmed.startsWith("data: ")) {
        try {
          const json  = JSON.parse(trimmed.slice(6));
          const token = json.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch {}
      }
    }
  }
  onDone();
}

export async function simpleCompletion(messages: ChatMessage[], model: string = DEFAULT_MODEL): Promise<string> {
  const isGroq   = model.startsWith("groq/");
  const actualId = isGroq ? model.replace(/^groq\//, "") : model;
  const apiKey   = isGroq ? GROQ_API_KEY : OPENROUTER_API_KEY;
  const baseUrl  = isGroq ? GROQ_BASE    : OPENROUTER_BASE;
  if (!apiKey) return `⚠️ No ${isGroq ? "GROQ_API_KEY" : "OPENROUTER_API_KEY"} configured.`;

  const headers: Record<string, string> = { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" };
  if (!isGroq) { headers["HTTP-Referer"] = process.env.APP_URL ?? "http://localhost:3000"; headers["X-Title"] = "CodeForge AI"; }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers,
    body: JSON.stringify({ model: actualId, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages], max_tokens: 1024 }),
  });
  if (!response.ok) throw new Error(`AI error ${response.status}`);
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

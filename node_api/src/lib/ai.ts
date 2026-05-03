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

// ── OpenRouter free-tier models ───────────────────────────────────────────────
export const OPENROUTER_MODELS: ModelInfo[] = [
  { id: "google/gemma-2-9b-it:free",                   label: "Gemma 2 9B",                provider: "openrouter", context: 8192,   badge: "Default"   },
  { id: "google/gemma-3-12b-it:free",                  label: "Gemma 3 12B",               provider: "openrouter", context: 131072, badge: "Google"    },
  { id: "meta-llama/llama-3.1-8b-instruct:free",       label: "Llama 3.1 8B Instruct",     provider: "openrouter", context: 131072, badge: "128k ctx"  },
  { id: "meta-llama/llama-3.2-3b-instruct:free",       label: "Llama 3.2 3B Instruct",     provider: "openrouter", context: 131072, badge: "Fast"      },
  { id: "meta-llama/llama-3-8b-instruct:free",         label: "Llama 3 8B",                provider: "openrouter", context: 8192,   badge: "Meta"      },
  { id: "microsoft/phi-3-mini-128k-instruct:free",     label: "Phi-3 Mini 128k",           provider: "openrouter", context: 131072, badge: "Microsoft" },
  { id: "deepseek/deepseek-r1:free",                   label: "DeepSeek R1",               provider: "openrouter", context: 163840, badge: "Reasoning" },
  { id: "deepseek/deepseek-r1-distill-llama-70b:free", label: "DeepSeek R1 Distill 70B",   provider: "openrouter", context: 131072, badge: "Reasoning" },
  { id: "qwen/qwen-2.5-7b-instruct:free",              label: "Qwen 2.5 7B",               provider: "openrouter", context: 131072, badge: "Alibaba"   },
  { id: "mistralai/mistral-nemo:free",                 label: "Mistral Nemo 12B",          provider: "openrouter", context: 131072, badge: "12B"       },
  { id: "openchat/openchat-7b:free",                   label: "OpenChat 7B",               provider: "openrouter", context: 8192,   badge: "Chat"      },
  { id: "mistralai/mistral-small-3.2-24b-instruct:free", label: "Mistral Small 3.2 24B",   provider: "openrouter", context: 131072, badge: "Mistral"   },
];

// ── Groq models — exact IDs from Groq Playground (May 2025) ──────────────────
// Prefix "groq/" is stripped before calling the Groq API
export const GROQ_MODELS: ModelInfo[] = [
  // Llama (Meta)
  { id: "groq/llama-3.3-70b-versatile",                  label: "Llama 3.3 70B Versatile",          provider: "groq", context: 131072, badge: "Groq Fast"  },
  { id: "groq/llama-3.1-8b-instant",                     label: "Llama 3.1 8B Instant",             provider: "groq", context: 131072, badge: "Groq Speed" },
  { id: "groq/meta-llama/llama-4-scout-17b-16e-instruct",label: "Llama 4 Scout 17B",                provider: "groq", context: 131072, badge: "Groq New"   },
  { id: "groq/meta-llama/llama-prompt-guard-2-22b",      label: "Llama Prompt Guard 2 22B",         provider: "groq", context: 4096,   badge: "Safety"     },
  { id: "groq/meta-llama/llama-prompt-guard-2-86b",      label: "Llama Prompt Guard 2 86B",         provider: "groq", context: 4096,   badge: "Safety"     },
  // Groq native
  { id: "groq/compound-beta",                             label: "Groq Compound",                    provider: "groq", context: 131072, badge: "Groq Agent" },
  { id: "groq/compound-beta-mini",                        label: "Groq Compound Mini",               provider: "groq", context: 131072, badge: "Groq Agent" },
  // Alibaba Cloud
  { id: "groq/qwen/qwen3-32b",                           label: "Qwen 3 32B",                       provider: "groq", context: 131072, badge: "Alibaba"    },
  // Canopy Labs
  { id: "groq/canopylabs/orpheus-v1-english",            label: "Orpheus v1 English",               provider: "groq", context: 4096,   badge: "Voice"      },
  { id: "groq/canopylabs/orpheus-arabic-saudi",          label: "Orpheus Arabic (Saudi)",           provider: "groq", context: 4096,   badge: "Voice"      },
  // OpenAI via Groq
  { id: "groq/openai/gpt-oss-120b",                      label: "GPT OSS 120B",                     provider: "groq", context: 131072, badge: "OpenAI/Groq"},
  { id: "groq/openai/gpt-oss-20b",                       label: "GPT OSS 20B",                      provider: "groq", context: 131072, badge: "OpenAI/Groq"},
];

export const FREE_MODELS: ModelInfo[] = [...OPENROUTER_MODELS, ...GROQ_MODELS];

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function groqModelId(id: string): string {
  // Strip our internal "groq/" prefix to get the real Groq model ID
  return id.replace(/^groq\//, "");
}

export async function* streamCompletion(
  model: string,
  messages: ChatMessage[],
  systemPrompt?: string,
): AsyncGenerator<string> {
  const isGroq      = model.startsWith("groq/");
  const apiKey      = isGroq ? GROQ_API_KEY : OPENROUTER_API_KEY;
  const baseUrl     = isGroq ? GROQ_BASE    : OPENROUTER_BASE;
  const modelId     = isGroq ? groqModelId(model) : model;

  if (!apiKey) {
    const provider = isGroq ? "Groq" : "OpenRouter";
    const envVar   = isGroq ? "GROQ_API_KEY" : "OPENROUTER_API_KEY";
    throw new Error(`No ${envVar} found. Run: cf config --${isGroq ? "groq" : "openrouter"}-key YOUR_KEY`);
  }

  const allMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const headers: Record<string, string> = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
  if (!isGroq) {
    headers["HTTP-Referer"] = "https://codeforge.ai";
    headers["X-Title"]      = "CodeForge AI";
  }

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method:  "POST",
    headers,
    body: JSON.stringify({ model: modelId, messages: allMessages, stream: true, max_tokens: 4096 }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`AI error (${resp.status}): ${body}`);
  }

  const reader  = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.replace(/^data:\s*/, "").trim();
      if (!trimmed || trimmed === "[DONE]") continue;
      try {
        const json  = JSON.parse(trimmed);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {}
    }
  }
}

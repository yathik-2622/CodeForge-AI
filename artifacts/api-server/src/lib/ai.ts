import { logger } from "./logger";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export const FREE_MODELS = [
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B" },
  { id: "meta-llama/llama-3-8b-instruct:free", label: "Llama 3 8B" },
  { id: "microsoft/phi-3-mini-128k-instruct:free", label: "Phi-3 Mini" },
  { id: "google/gemma-3-12b-it:free", label: "Gemma 3 12B" },
];

export const DEFAULT_MODEL = FREE_MODELS[0].id;

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

export async function streamCompletion(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  if (!OPENROUTER_API_KEY) {
    onToken("⚠️ No OPENROUTER_API_KEY set. Add it to your environment variables to enable real AI responses.\n\nVisit https://openrouter.ai to get a free API key with access to open-source models like Mistral 7B, Llama 3, and Phi-3.");
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

    if (!response.ok || !response.body) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") {
          if (trimmed === "data: [DONE]") { onDone(); return; }
          continue;
        }
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const token = json.choices?.[0]?.delta?.content;
            if (token) onToken(token);
          } catch {
          }
        }
      }
    }
    onDone();
  } catch (err) {
    logger.error(err, "AI streaming error");
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function simpleCompletion(messages: ChatMessage[], model: string = DEFAULT_MODEL): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return "⚠️ No OPENROUTER_API_KEY configured. Add your OpenRouter API key to enable AI responses.";
  }
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
      max_tokens: 1024,
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter ${response.status}`);
  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

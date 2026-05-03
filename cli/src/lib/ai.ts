import fetch from "node-fetch";
import { loadConfig } from "./config";

export interface Message { role: "system"|"user"|"assistant"; content: string; }

const SYSTEM = `You are CodeForge AI — an expert autonomous coding agent in a developer terminal.
You write production-quality code, fix bugs, explain complex systems, generate tests, and refactor code.
When returning code, always wrap it in fenced code blocks with the language specified.
Be precise, concise, and always give working code.`;

export async function streamChat(
  messages: Message[],
  onToken: (t: string) => void,
  onDone:  () => void,
): Promise<void> {
  const cfg = loadConfig();
  const model   = cfg.model;
  const isGroq  = model.startsWith("groq/");
  const actualId = isGroq ? model.replace(/^groq\//, "") : model;
  const apiKey   = isGroq ? (cfg.groqApiKey  || process.env.GROQ_API_KEY  || "") 
                           : (cfg.openrouterApiKey || process.env.OPENROUTER_API_KEY || "");
  const baseUrl  = isGroq ? "https://api.groq.com/openai/v1"
                           : "https://openrouter.ai/api/v1";

  if (!apiKey) {
    const provider = isGroq ? "GROQ_API_KEY" : "OPENROUTER_API_KEY";
    onToken(`\n⚠️  No ${provider} found.\nRun: codeforge config --key ${provider} <your-key>\n`);
    onDone();
    return;
  }

  const headers: Record<string,string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type":  "application/json",
  };
  if (!isGroq) {
    headers["HTTP-Referer"] = "https://codeforge.ai";
    headers["X-Title"]      = "CodeForge CLI";
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers,
    body: JSON.stringify({
      model: actualId,
      messages: [{ role:"system", content: SYSTEM }, ...messages],
      stream: true,
      max_tokens: 4096,
      temperature: 0.3,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text();
    onToken(`\n❌ AI error (${res.status}): ${err}\n`);
    onDone();
    return;
  }

  const body = res.body as any;
  let buf = "";
  for await (const chunk of body) {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t || t === "data: [DONE]") { if (t === "data: [DONE]") { onDone(); return; } continue; }
      if (t.startsWith("data: ")) {
        try {
          const d = JSON.parse(t.slice(6));
          const tok = d.choices?.[0]?.delta?.content;
          if (tok) onToken(tok);
        } catch {}
      }
    }
  }
  onDone();
}

export async function oneShot(messages: Message[]): Promise<string> {
  return new Promise((res) => {
    let out = "";
    streamChat(messages, (t) => { out += t; }, () => res(out)).catch(() => res(out));
  });
}

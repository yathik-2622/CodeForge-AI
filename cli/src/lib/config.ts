import fs from "fs";
import path from "path";
import os from "os";

export interface Config {
  model:            string;
  openrouterApiKey: string;
  groqApiKey:       string;
  serverUrl:        string;
  autoApply:        boolean;
}

const CONFIG_PATH = path.join(os.homedir(), ".codeforge", "config.json");
const DEFAULTS: Config = {
  model:            "google/gemma-2-9b-it:free",
  openrouterApiKey: "",
  groqApiKey:       "",
  serverUrl:        "http://localhost:3000",
  autoApply:        false,
};

export function loadConfig(): Config {
  // Load saved config file first
  let saved: Partial<Config> = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      saved = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Partial<Config>;
    }
  } catch {}

  // Env vars only override if they are actually set (non-empty)
  // They do NOT overwrite keys already saved in config file
  const fromEnv: Partial<Config> = {};
  if (process.env.OPENROUTER_API_KEY) fromEnv.openrouterApiKey = process.env.OPENROUTER_API_KEY;
  if (process.env.GROQ_API_KEY)       fromEnv.groqApiKey       = process.env.GROQ_API_KEY;

  // Also try local .env in cwd as a fallback (for project-level keys)
  if (!fromEnv.openrouterApiKey && !saved.openrouterApiKey) {
    const localEnv = path.join(process.cwd(), ".env");
    if (fs.existsSync(localEnv)) {
      const lines = fs.readFileSync(localEnv, "utf-8").split("\n");
      for (const line of lines) {
        const [k, ...rest] = line.split("=");
        const v = rest.join("=").trim().replace(/^["']/,"").replace(/["']$/,"");
        if (k?.trim() === "OPENROUTER_API_KEY" && v) fromEnv.openrouterApiKey = v;
        if (k?.trim() === "GROQ_API_KEY"        && v) fromEnv.groqApiKey       = v;
      }
    }
  }

  // Priority: env vars > saved file > defaults
  return { ...DEFAULTS, ...saved, ...fromEnv };
}

export function saveConfig(updates: Partial<Config>): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Read the raw saved file (not merged with env) to avoid overwriting env-sourced values
  let current: Partial<Config> = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      current = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Partial<Config>;
    }
  } catch {}
  const merged = { ...DEFAULTS, ...current, ...updates };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
}

export function getConfigPath(): string { return CONFIG_PATH; }

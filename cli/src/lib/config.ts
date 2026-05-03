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
  model:            "mistralai/mistral-7b-instruct:free",
  openrouterApiKey: "",
  groqApiKey:       "",
  serverUrl:        "http://localhost:3000",
  autoApply:        false,
};

export function loadConfig(): Config {
  const fromEnv: Partial<Config> = {
    openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
    groqApiKey:       process.env.GROQ_API_KEY        || "",
  };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Partial<Config>;
      return { ...DEFAULTS, ...saved, ...fromEnv };
    }
  } catch {}
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
  return { ...DEFAULTS, ...fromEnv };
}

export function saveConfig(updates: Partial<Config>): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const current = loadConfig();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...updates }, null, 2));
}

export function getConfigPath(): string { return CONFIG_PATH; }

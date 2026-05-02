import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

const CONFIG_DIR = join(homedir(), ".codeforge");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  serverUrl: string;
  model: string;
  authToken?: string;
}

const DEFAULT_CONFIG: Config = {
  serverUrl: "",
  model: "mistralai/mistral-7b-instruct:free",
};

export function getConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setConfig(updates: Partial<Config>): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const current = getConfig();
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...updates }, null, 2));
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

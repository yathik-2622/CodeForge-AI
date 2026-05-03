import { MongoClient, Db, Collection, ObjectId } from "mongodb";

export { ObjectId };

const MONGODB_URL = process.env.MONGODB_URL ?? "mongodb://localhost:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB ?? "CodeForge_AI";

let _client: MongoClient | null = null;
let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (!_db) {
    _client = new MongoClient(MONGODB_URL, { maxPoolSize: 20, minPoolSize: 2, connectTimeoutMS: 10_000, socketTimeoutMS: 45_000 });
    await _client.connect();
    _db = _client.db(MONGODB_DB_NAME);
    await ensureIndexes(_db);
  }
  return _db;
}

async function ensureIndexes(db: Db) {
  await Promise.allSettled([
    db.collection("users").createIndex({ githubId: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ updatedAt: -1 }),
    db.collection("sessions").createIndex({ title: 1 }),
    db.collection("messages").createIndex({ sessionId: 1, createdAt: 1 }),
    db.collection("repositories").createIndex({ fullName: 1 }, { unique: true }),
    db.collection("deployments").createIndex({ repositoryId: 1 }),
    db.collection("security_findings").createIndex({ repositoryId: 1 }),
    db.collection("activity").createIndex({ createdAt: -1 }),
    db.collection("executions").createIndex({ createdAt: -1 }),
  ]);
}

export async function col<T extends Record<string, any> = Record<string, any>>(
  name: string,
): Promise<Collection<T>> {
  return (await getDb()).collection<T>(name);
}

// ── Schema types ─────────────────────────────────────────────────────────────
export interface User {
  _id: ObjectId; githubId: number; login: string;
  name?: string | null; email?: string | null; avatarUrl?: string | null;
  githubToken?: string | null; createdAt: Date; updatedAt: Date;
}
export interface Session {
  _id: ObjectId; title: string; repositoryId?: string | null;
  status: "active" | "idle" | "completed" | "error";
  model: string; messageCount: number; createdAt: Date; updatedAt: Date;
}
export interface Message {
  _id: ObjectId; sessionId: string; role: "user" | "assistant" | "system" | "agent";
  content: string; agentType?: string | null; metadata?: Record<string, any> | null; createdAt: Date;
}
export interface Repository {
  _id: ObjectId; name: string; fullName: string;
  provider: "github" | "gitlab" | "bitbucket" | "azure" | "local";
  url: string; language: string; status: "connected" | "scanning" | "ready" | "error";
  lastScannedAt?: Date | null; fileCount: number; lineCount: number;
  frameworks: string[]; description: string; branches: string[];
  dependencies: string[]; apis: string[]; databases: string[];
  cicdPlatform?: string | null; analysis?: any; createdAt: Date;
}
export interface Agent {
  _id: ObjectId; type: string; status: "idle" | "running" | "waiting" | "complete" | "error";
  currentTask?: string | null; tasksCompleted: number; sessionId?: string | null; lastActiveAt: Date;
}
export interface Deployment {
  _id: ObjectId; repositoryId: string; environment: string; platform: string;
  status: string; version: string; branch: string; commitHash: string;
  deployedBy: string; durationMs?: number | null; createdAt: Date; completedAt?: Date | null;
}
export interface SecurityFinding {
  _id: ObjectId; repositoryId: string; title: string; description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string; file?: string | null; line?: number | null;
  status: "open" | "resolved" | "dismissed"; detectedAt: Date;
}
export interface Activity {
  _id: ObjectId; type: string; title: string; description: string;
  repositoryId?: string | null; repositoryName?: string | null;
  agentType?: string | null; severity?: string | null; createdAt: Date;
}
export interface Execution {
  _id: ObjectId; command: string; status: string; output: string;
  exitCode?: number | null; sessionId?: string | null;
  durationMs?: number | null; createdAt: Date;
}

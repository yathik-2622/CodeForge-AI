import { MongoClient, Db, Collection, ObjectId, Document } from "mongodb";

export { ObjectId };

const MONGODB_URL    = process.env.MONGODB_URL ?? "mongodb://localhost:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB  ?? "CodeForge_AI";

let _client: MongoClient | null = null;
let _db: Db | null              = null;
let _dead = false;  // once we know DB is unreachable, stop retrying immediately

function isConnError(err: any): boolean {
  return (
    err?.name === "MongoServerSelectionError" ||
    err?.message?.includes("ECONNREFUSED") ||
    err?.message?.includes("failed to connect") ||
    err?.message?.includes("getaddrinfo")
  );
}

/** Returns a Proxy Collection that always returns empty / no-op results. */
function emptyCollection<T extends Document>(): Collection<T> {
  const chainable: any = {
    sort:   () => chainable,
    limit:  () => chainable,
    skip:   () => chainable,
    project:() => chainable,
    toArray: async () => [],
  };
  return new Proxy({} as any, {
    get(_t, prop: string) {
      if (prop === "find" || prop === "aggregate") return () => chainable;
      if (prop === "findOne")        return async () => null;
      if (prop === "insertOne")      return async () => ({ insertedId: new ObjectId(), acknowledged: true });
      if (prop === "insertMany")     return async () => ({ insertedIds: {}, acknowledged: true });
      if (prop === "updateOne")      return async () => ({ modifiedCount: 0, matchedCount: 0, acknowledged: true });
      if (prop === "updateMany")     return async () => ({ modifiedCount: 0, matchedCount: 0, acknowledged: true });
      if (prop === "deleteOne")      return async () => ({ deletedCount: 0, acknowledged: true });
      if (prop === "deleteMany")     return async () => ({ deletedCount: 0, acknowledged: true });
      if (prop === "countDocuments") return async () => 0;
      if (prop === "createIndex")    return async () => "";
      if (prop === "distinct")       return async () => [];
      return async () => {};
    },
  }) as unknown as Collection<T>;
}

export async function getDb(): Promise<Db> {
  if (_dead) throw new Error("MongoDB not connected");
  if (_db)   return _db;

  try {
    _client = new MongoClient(MONGODB_URL, {
      maxPoolSize: 20,
      minPoolSize: 2,
      connectTimeoutMS:          5_000,
      socketTimeoutMS:          10_000,
      serverSelectionTimeoutMS:  5_000,
    });
    await _client.connect();
    _db = _client.db(MONGODB_DB_NAME);
    await ensureIndexes(_db);
    return _db;
  } catch (err) {
    _dead = true;
    const url = MONGODB_URL.replace(/:\/\/[^@]+@/, "://<redacted>@");
    console.warn(`[db] MongoDB unreachable at ${url} — running in offline mode (all DB reads return empty)`);
    throw err;
  }
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
    db.collection("agents").createIndex({ lastActiveAt: -1 }),
  ]);
}

/**
 * Returns the named MongoDB collection.
 * If the database is unreachable, returns a no-op empty collection so routes
 * return empty arrays / null instead of crashing with a 500.
 */
export async function col<T extends Document = Document>(name: string): Promise<Collection<T>> {
  try {
    const db = await getDb();
    return db.collection<T>(name);
  } catch (err) {
    if (isConnError(err) || (err as any)?.message === "MongoDB not connected") {
      return emptyCollection<T>();
    }
    throw err;
  }
}

// Re-export common types used by routes
export type { Repository, Agent, SecurityFinding, Deployment, Activity, Session, User, Message, Execution };

interface Repository { provider: string; name: string; fullName: string; url: string; language: string; status: string; lastScannedAt?: Date; fileCount: number; lineCount: number; frameworks: string[]; createdAt: Date; description?: string; branches?: any[]; dependencies?: any[]; apis?: any[]; databases?: any[]; cicdPlatform?: string; }
interface Agent        { type: string; status: string; currentTask?: string; tasksCompleted: number; sessionId?: string; lastActiveAt: Date; }
interface SecurityFinding { repositoryId: string; title: string; description: string; severity: string; category: string; file?: string; line?: number; status: string; detectedAt: Date; }
interface Deployment   { repositoryId: string; environment: string; platform: string; status: string; version: string; branch: string; commitHash: string; deployedBy: string; durationMs?: number; createdAt: Date; completedAt?: Date; }
interface Activity     { type: string; title: string; description: string; repositoryName?: string; agentType?: string; severity?: string; createdAt: Date; }
interface Session      { title: string; repositoryId?: string; model: string; status: string; messageCount: number; createdAt: Date; updatedAt: Date; }
interface User         { githubId: number; login: string; name: string | null; email: string | null; avatarUrl: string; githubToken: string; createdAt: Date; updatedAt: Date; }
interface Message      { sessionId: string; role: string; content: string; agentType?: string; metadata?: any; createdAt: Date; }
interface Execution    { command: string; status: string; output: string; exitCode?: number; sessionId?: string; durationMs?: number; createdAt: Date; }

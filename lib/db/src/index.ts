import { MongoClient, Db, Collection, ObjectId } from "mongodb";

export { ObjectId };

const MONGODB_URL = process.env.MONGODB_URL ?? "mongodb://localhost:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB ?? "codeforge";

let _client: MongoClient | null = null;
let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (!_db) {
    _client = new MongoClient(MONGODB_URL, {
      maxPoolSize: 20,
      minPoolSize: 2,
      connectTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
    });
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
  const db = await getDb();
  return db.collection<T>(name);
}

export * from "./schema/index.js";

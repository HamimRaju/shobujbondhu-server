import { Db, MongoClient } from "mongodb";
import { env } from "./env";

let client: MongoClient | null = null;
let database: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (database) return database;

  const nextClient = new MongoClient(env.MONGODB_URI, {
    appName: "shobujbondhu-server",
    serverSelectionTimeoutMS: 10_000,
  });

  try {
    await nextClient.connect();
    await nextClient.db(env.DB_NAME).command({ ping: 1 });
  } catch (error) {
    await nextClient.close().catch(() => undefined);
    // Driver messages can include host details, so only the error name is surfaced.
    const name = error instanceof Error ? error.name : "UnknownError";
    throw new Error(
      `Failed to connect to MongoDB (${name}). Check MONGODB_URI, credentials and network access.`,
    );
  }

  client = nextClient;
  database = nextClient.db(env.DB_NAME);
  return database;
}

export function getDb(): Db {
  if (!database) {
    throw new Error("Database is not connected. Call connectToDatabase() first.");
  }
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
  }
  client = null;
  database = null;
}

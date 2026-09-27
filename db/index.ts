import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(url, { max: 1, idle_timeout: 1, connect_timeout: 5 });
  dbInstance = drizzle(client);
  return dbInstance;
}

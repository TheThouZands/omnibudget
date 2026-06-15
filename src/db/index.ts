import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

const databaseUrl = requireEnv(
  ["DATABASE_URL", "POSTGRES_URL"],
  "Postgres connection string",
);

const globalForDb = globalThis as unknown as {
  postgresClient?: postgres.Sql;
};

export const dbClient =
  globalForDb.postgresClient ?? postgres(databaseUrl, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresClient = dbClient;
}

export const db = drizzle(dbClient, { schema });

export * as dbSchema from "./schema";

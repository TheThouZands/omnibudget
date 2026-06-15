import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env" });

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }
};

const databaseUrl = readEnv("DATABASE_URL", "POSTGRES_URL");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "",
  },
  migrations: {
    prefix: "supabase",
  },
  strict: true,
  verbose: true,
});

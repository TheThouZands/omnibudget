import { randomBytes } from "node:crypto";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";
import { createAccountAuth } from "./account-auth";
import { loadVerificationSessionService, verificationStoreMode } from "./verification-session-runtime";
import { MemoryAccountRepository } from "../repositories/memory-account-repository";

const state = globalThis as unknown as {
  accountMemoryDB?: MemoryDB;
  accountMemoryRepository?: MemoryAccountRepository;
  developmentAuthSecret?: string;
};

export async function loadAccountRuntime(baseURL: string) {
  const production = process.env.NODE_ENV === "production";
  const store = verificationStoreMode(production);
  const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (production && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error("BETTER_AUTH_SECRET requires at least 32 random characters in production.");
  }
  state.developmentAuthSecret ??= randomBytes(32).toString("hex");
  const secret = configuredSecret ?? state.developmentAuthSecret;
  const verification = await loadVerificationSessionService();
  const { accounts, database } = await (async () => {
    if (store === "memory") {
      state.accountMemoryDB ??= {};
      state.accountMemoryRepository ??= new MemoryAccountRepository(state.accountMemoryDB);
      return { accounts: state.accountMemoryRepository, database: memoryAdapter(state.accountMemoryDB) };
    }
    const [{ drizzleAdapter }, { db }, schema, { DrizzleAccountRepository }] = await Promise.all([
      import("@better-auth/drizzle-adapter"), import("@/db"), import("@/db/schema"),
      import("../repositories/drizzle-account-repository"),
    ]);
    return { accounts: new DrizzleAccountRepository(), database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }) };
  })();
  const auth = createAccountAuth({ accounts, database, verification, secret, production, baseURL: process.env.BETTER_AUTH_URL || baseURL });
  return { auth, accounts, verification };
}

export type AccountRuntime = Awaited<ReturnType<typeof loadAccountRuntime>>;

export async function findAccountSession(headers: Headers, runtime: AccountRuntime) {
  const session = await runtime.auth.api.getSession({ headers, query: { disableRefresh: true } });
  if (!session) return null;
  const account = await runtime.accounts.findByEmail(session.user.email);
  return account && !account.deletedAt && account.emailVerified ? session : null;
}

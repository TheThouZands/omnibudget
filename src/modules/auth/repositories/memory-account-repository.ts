import { randomUUID } from "node:crypto";
import type { MemoryDB } from "better-auth/adapters/memory";
import type { AccountRepository, AuthUser } from "../models/account";
import type { RegistrationInput } from "../models/account-input";

export class MemoryAccountRepository implements AccountRepository {
  private attempts = new Map<string, { count: number; expiresAt: Date }>();
  constructor(readonly database: MemoryDB) {
    database.users ??= [];
    database.authSessions ??= [];
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.database.users.find((user) => user.email.toLowerCase() === email) ?? null;
  }

  async create(input: RegistrationInput, passwordHash: string) {
    if (this.database.users.some((user) => user.email === input.email)) throw new Error("account_exists");
    const user: AuthUser = {
      id: randomUUID(), email: input.email, name: input.username,
      emailVerified: true, image: null, passwordHash,
      country: input.country || null, phone: input.phone || null,
      // TODO: Set true only after a future server-side phone verification service succeeds.
      phoneVerified: false, defaultWorkspaceName: input.workspaceName,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    };
    this.database.users.push(user);
    return user;
  }

  async attempt(id: string, expiresAt: Date) {
    for (const [key, value] of this.attempts) {
      if (value.expiresAt <= new Date()) this.attempts.delete(key);
    }
    const count = (this.attempts.get(id)?.count ?? 0) + 1;
    this.attempts.set(id, { count, expiresAt });
    return count <= 5;
  }
}

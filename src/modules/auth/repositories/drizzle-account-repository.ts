import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { authAttempts, users } from "@/db/schema";
import type { AccountRepository } from "../models/account";
import type { RegistrationInput } from "../models/account-input";
import { registrationPhone } from "../models/registration-phone";

export class DrizzleAccountRepository implements AccountRepository {
  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email)).limit(1);
    return user ?? null;
  }

  async create(input: RegistrationInput, passwordHash: string) {
    const [user] = await db.insert(users).values({
      email: input.email, name: input.username, emailVerified: true, passwordHash,
      country: input.country || null, ...registrationPhone(input),
      defaultWorkspaceName: input.workspaceName,
    }).returning();
    return user;
  }

  async attempt(verificationSessionId: string) {
    const [attempt] = await db.insert(authAttempts).values({ verificationSessionId, count: 1 })
      .onConflictDoUpdate({
        target: authAttempts.verificationSessionId,
        set: { count: sql`${authAttempts.count} + 1` },
        setWhere: sql`${authAttempts.count} < 5`,
      }).returning({ count: authAttempts.count });
    return Boolean(attempt);
  }
}

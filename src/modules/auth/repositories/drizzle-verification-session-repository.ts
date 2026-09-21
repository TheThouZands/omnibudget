import {
  and,
  eq,
  gt,
  isNull,
} from "drizzle-orm";

import { db } from "@/db";
import { emailVerificationSessions } from "@/db/schema";

import type {
  EmailVerificationSession,
  VerificationSessionRepository,
} from "../models/verification-session";

export class DrizzleVerificationSessionRepository
implements VerificationSessionRepository {
  async create(
    session: EmailVerificationSession,
    previousTokenDigest?: string,
  ) {
    await db.transaction(async (transaction) => {
      if (previousTokenDigest) {
        await transaction
          .update(emailVerificationSessions)
          .set({ revokedAt: session.createdAt })
          .where(and(
            eq(emailVerificationSessions.tokenDigest, previousTokenDigest),
            isNull(emailVerificationSessions.revokedAt),
          ));
      }

      await transaction.insert(emailVerificationSessions).values(session);
    });
  }

  async findActive(tokenDigest: string, now: Date) {
    const [session] = await db
      .select()
      .from(emailVerificationSessions)
      .where(and(
        eq(emailVerificationSessions.tokenDigest, tokenDigest),
        isNull(emailVerificationSessions.revokedAt),
        gt(emailVerificationSessions.expiresAt, now),
      ))
      .limit(1);

    return session ?? null;
  }

  async revoke(tokenDigest: string, revokedAt: Date) {
    await db
      .update(emailVerificationSessions)
      .set({ revokedAt })
      .where(and(
        eq(emailVerificationSessions.tokenDigest, tokenDigest),
        isNull(emailVerificationSessions.revokedAt),
      ));
  }

  async consume(tokenDigest: string, now: Date) {
    const claimed = await db.update(emailVerificationSessions)
      .set({ revokedAt: now })
      .where(and(
        eq(emailVerificationSessions.tokenDigest, tokenDigest),
        isNull(emailVerificationSessions.revokedAt),
        gt(emailVerificationSessions.expiresAt, now),
      )).returning({ id: emailVerificationSessions.id });
    return claimed.length === 1;
  }
}

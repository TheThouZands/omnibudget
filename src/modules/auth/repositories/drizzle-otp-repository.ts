import {
  and,
  desc,
  eq,
  isNull,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import { emailOtpChallenges } from "@/db/schema";

import type {
  IssueChallengeResult,
  OtpChallenge,
  OtpChallengeRepository,
  VerifyChallengeResult,
} from "../models/otp";

export class DrizzleOtpRepository implements OtpChallengeRepository {
  async issue(
    challenge: OtpChallenge,
    cooldownMs: number,
  ): Promise<IssueChallengeResult> {
    return db.transaction(async (transaction) => {
      // Serialize issuance per normalized address so concurrent requests cannot
      // evade the cooldown or leave more than one active challenge.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${challenge.email}, 0))`,
      );

      const [previous] = await transaction
        .select({ createdAt: emailOtpChallenges.createdAt })
        .from(emailOtpChallenges)
        .where(eq(emailOtpChallenges.email, challenge.email))
        .orderBy(desc(emailOtpChallenges.createdAt))
        .limit(1);

      if (previous) {
        const elapsedMs = challenge.createdAt.getTime() - previous.createdAt.getTime();

        if (elapsedMs < cooldownMs) {
          return {
            status: "rate_limited",
            retryAfterSeconds: Math.max(
              1,
              Math.ceil((cooldownMs - elapsedMs) / 1000),
            ),
          };
        }
      }

      await transaction
        .update(emailOtpChallenges)
        .set({ consumedAt: challenge.createdAt })
        .where(and(
          eq(emailOtpChallenges.email, challenge.email),
          isNull(emailOtpChallenges.consumedAt),
        ));

      await transaction.insert(emailOtpChallenges).values({
        id: challenge.id,
        email: challenge.email,
        codeDigest: challenge.codeDigest,
        createdAt: challenge.createdAt,
        expiresAt: challenge.expiresAt,
        consumedAt: challenge.consumedAt,
        attemptCount: challenge.attemptCount,
        maxAttempts: challenge.maxAttempts,
      });

      return { status: "created" };
    });
  }

  async verify(
    challengeId: string,
    email: string,
    now: Date,
    acceptsDigest: (storedDigest: string) => boolean,
  ): Promise<VerifyChallengeResult> {
    return db.transaction(async (transaction) => {
      const [challenge] = await transaction
        .select()
        .from(emailOtpChallenges)
        .where(and(
          eq(emailOtpChallenges.id, challengeId),
          eq(emailOtpChallenges.email, email),
        ))
        .limit(1)
        .for("update");

      if (
        !challenge
        || challenge.consumedAt !== null
        || challenge.expiresAt.getTime() <= now.getTime()
        || challenge.attemptCount >= challenge.maxAttempts
      ) {
        return { status: "rejected" };
      }

      if (acceptsDigest(challenge.codeDigest)) {
        await transaction
          .update(emailOtpChallenges)
          .set({ consumedAt: now })
          .where(eq(emailOtpChallenges.id, challenge.id));
        return { status: "verified" };
      }

      const attemptCount = challenge.attemptCount + 1;
      await transaction
        .update(emailOtpChallenges)
        .set({
          attemptCount,
          ...(attemptCount >= challenge.maxAttempts ? { consumedAt: now } : {}),
        })
        .where(eq(emailOtpChallenges.id, challenge.id));

      return { status: "rejected" };
    });
  }

  async revoke(challengeId: string, consumedAt: Date) {
    await db
      .update(emailOtpChallenges)
      .set({ consumedAt })
      .where(and(
        eq(emailOtpChallenges.id, challengeId),
        isNull(emailOtpChallenges.consumedAt),
      ));
  }
}

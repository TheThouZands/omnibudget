import type {
  IssueChallengeResult,
  OtpChallenge,
  OtpChallengeRepository,
  VerifyChallengeResult,
} from "../models/otp";

export class MemoryOtpRepository implements OtpChallengeRepository {
  private readonly challenges = new Map<string, OtpChallenge>();

  async issue(
    challenge: OtpChallenge,
    cooldownMs: number,
  ): Promise<IssueChallengeResult> {
    const previous = [...this.challenges.values()]
      .filter((entry) => entry.email === challenge.email)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];

    if (previous) {
      const elapsedMs = challenge.createdAt.getTime() - previous.createdAt.getTime();

      if (elapsedMs < cooldownMs) {
        return {
          status: "rate_limited",
          retryAfterSeconds: Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 1000)),
        };
      }
    }

    for (const entry of this.challenges.values()) {
      if (entry.email === challenge.email && entry.consumedAt === null) {
        entry.consumedAt = challenge.createdAt;
      }
    }

    this.challenges.set(challenge.id, { ...challenge });
    return { status: "created" };
  }

  async verify(
    challengeId: string,
    email: string,
    now: Date,
    acceptsDigest: (storedDigest: string) => boolean,
  ): Promise<VerifyChallengeResult> {
    const challenge = this.challenges.get(challengeId);

    if (
      !challenge
      || challenge.email !== email
      || challenge.consumedAt !== null
      || challenge.expiresAt.getTime() <= now.getTime()
      || challenge.attemptCount >= challenge.maxAttempts
    ) {
      return { status: "rejected" };
    }

    if (acceptsDigest(challenge.codeDigest)) {
      challenge.consumedAt = now;
      return { status: "verified" };
    }

    challenge.attemptCount += 1;
    if (challenge.attemptCount >= challenge.maxAttempts) {
      challenge.consumedAt = now;
    }

    return { status: "rejected" };
  }

  async revoke(challengeId: string, consumedAt: Date) {
    const challenge = this.challenges.get(challengeId);

    if (challenge && challenge.consumedAt === null) {
      challenge.consumedAt = consumedAt;
    }
  }

  inspect(challengeId: string) {
    const challenge = this.challenges.get(challengeId);
    return challenge ? { ...challenge } : undefined;
  }
}

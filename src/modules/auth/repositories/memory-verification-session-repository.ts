import type {
  EmailVerificationSession,
  VerificationSessionRepository,
} from "../models/verification-session";

export class MemoryVerificationSessionRepository
implements VerificationSessionRepository {
  private readonly sessions = new Map<string, EmailVerificationSession>();

  async create(
    session: EmailVerificationSession,
    previousTokenDigest?: string,
  ) {
    if (previousTokenDigest) {
      const previous = this.sessions.get(previousTokenDigest);

      if (previous && previous.revokedAt === null) {
        previous.revokedAt = session.createdAt;
      }
    }

    this.sessions.set(session.tokenDigest, { ...session });
  }

  async findActive(tokenDigest: string, now: Date) {
    const session = this.sessions.get(tokenDigest);

    if (
      !session
      || session.revokedAt !== null
      || session.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }

    return { ...session };
  }

  async revoke(tokenDigest: string, revokedAt: Date) {
    const session = this.sessions.get(tokenDigest);

    if (session && session.revokedAt === null) {
      session.revokedAt = revokedAt;
    }
  }

  inspect(tokenDigest: string) {
    const session = this.sessions.get(tokenDigest);
    return session ? { ...session } : undefined;
  }

  async consume(tokenDigest: string, now: Date) {
    const session = this.sessions.get(tokenDigest);
    if (!session || session.revokedAt || session.expiresAt <= now) return false;
    session.revokedAt = now;
    return true;
  }
}

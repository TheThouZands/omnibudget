export const VERIFICATION_SESSION_POLICY = {
  lifetimeMs: 30 * 60 * 1000,
  tokenBytes: 32,
} as const;

export type EmailVerificationSession = {
  id: string;
  otpChallengeId: string;
  email: string;
  tokenDigest: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface VerificationSessionRepository {
  create(
    session: EmailVerificationSession,
    previousTokenDigest?: string,
  ): Promise<void>;
  findActive(
    tokenDigest: string,
    now: Date,
  ): Promise<EmailVerificationSession | null>;
  revoke(tokenDigest: string, revokedAt: Date): Promise<void>;
  consume(tokenDigest: string, now: Date): Promise<boolean>;
}

export type IssuedVerificationSession = {
  token: string;
  expiresAt: Date;
};

export const OTP_POLICY = {
  codeDigits: 6,
  lifetimeMs: 10 * 60 * 1000,
  requestCooldownMs: 60 * 1000,
  maxAttempts: 5,
} as const;

export type OtpErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "delivery_failed"
  | "code_invalid_or_expired";

export class OtpError extends Error {
  constructor(
    readonly code: OtpErrorCode,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "OtpError";
  }
}

export type OtpChallenge = {
  id: string;
  email: string;
  codeDigest: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  attemptCount: number;
  maxAttempts: number;
};

export type IssueChallengeResult =
  | { status: "created" }
  | { status: "rate_limited"; retryAfterSeconds: number };

export type VerifyChallengeResult =
  | { status: "verified" }
  | { status: "rejected" };

export interface OtpChallengeRepository {
  issue(
    challenge: OtpChallenge,
    cooldownMs: number,
  ): Promise<IssueChallengeResult>;
  verify(
    challengeId: string,
    email: string,
    now: Date,
    acceptsDigest: (storedDigest: string) => boolean,
  ): Promise<VerifyChallengeResult>;
  revoke(challengeId: string, consumedAt: Date): Promise<void>;
}

export type OtpDelivery = {
  to: string;
  code: string;
  expiresAt: Date;
};

export interface OtpCodeSender {
  send(delivery: OtpDelivery): Promise<{ developmentCode?: string }>;
}

export type OtpIssueResponse = {
  challengeId: string;
  expiresAt: string;
  developmentCode?: string;
};

export type OtpVerification = {
  verified: true;
  challengeId: string;
  email: string;
};

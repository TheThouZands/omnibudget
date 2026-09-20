import { randomUUID } from "node:crypto";

import {
  OTP_POLICY,
  OtpError,
  type OtpChallengeRepository,
  type OtpCodeSender,
  type OtpIssueResponse,
  type OtpVerification,
} from "../models/otp";
import {
  digestOtp,
  generateOtpCode,
  otpDigestMatches,
} from "./otp-crypto";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHALLENGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OtpServiceDependencies = {
  repository: OtpChallengeRepository;
  sender: OtpCodeSender;
  hashSecret: string;
  now?: () => Date;
  createChallengeId?: () => string;
  createCode?: () => string;
};

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (email.length === 0 || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    throw new OtpError("invalid_request", 400);
  }

  return email;
}

function validateCode(value: string) {
  if (!new RegExp(`^\\d{${OTP_POLICY.codeDigits}}$`).test(value)) {
    throw new OtpError("invalid_request", 400);
  }

  return value;
}

function validateChallengeId(value: string) {
  if (!CHALLENGE_ID_PATTERN.test(value)) {
    throw new OtpError("invalid_request", 400);
  }

  return value;
}

export function createOtpService({
  repository,
  sender,
  hashSecret,
  now = () => new Date(),
  createChallengeId = randomUUID,
  createCode = generateOtpCode,
}: OtpServiceDependencies) {
  if (hashSecret.length < 32) {
    throw new Error("OTP hash secret must contain at least 32 characters.");
  }

  return {
    async issue(rawEmail: string): Promise<OtpIssueResponse> {
      const email = normalizeEmail(rawEmail);
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + OTP_POLICY.lifetimeMs);
      const challengeId = createChallengeId();
      const code = createCode();
      const codeDigest = digestOtp({
        challengeId,
        email,
        code,
        secret: hashSecret,
      });

      const issued = await repository.issue({
        id: challengeId,
        email,
        codeDigest,
        createdAt,
        expiresAt,
        consumedAt: null,
        attemptCount: 0,
        maxAttempts: OTP_POLICY.maxAttempts,
      }, OTP_POLICY.requestCooldownMs);

      if (issued.status === "rate_limited") {
        throw new OtpError("rate_limited", 429, issued.retryAfterSeconds);
      }

      try {
        const delivery = await sender.send({ to: email, code, expiresAt });
        return {
          challengeId,
          expiresAt: expiresAt.toISOString(),
          ...(delivery.developmentCode
            ? { developmentCode: delivery.developmentCode }
            : {}),
        };
      } catch {
        await repository.revoke(challengeId, now());
        throw new OtpError("delivery_failed", 502);
      }
    },

    async verify(
      rawChallengeId: string,
      rawEmail: string,
      rawCode: string,
    ): Promise<OtpVerification> {
      const challengeId = validateChallengeId(rawChallengeId);
      const email = normalizeEmail(rawEmail);
      const code = validateCode(rawCode);
      const candidateDigest = digestOtp({
        challengeId,
        email,
        code,
        secret: hashSecret,
      });

      const result = await repository.verify(
        challengeId,
        email,
        now(),
        (storedDigest) => otpDigestMatches(candidateDigest, storedDigest),
      );

      if (result.status !== "verified") {
        throw new OtpError("code_invalid_or_expired", 401);
      }

      return { verified: true, challengeId, email };
    },
  };
}

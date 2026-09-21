import { randomUUID } from "node:crypto";

import type {
  IssuedVerificationSession,
  VerificationSessionRepository,
} from "../models/verification-session";
import { VERIFICATION_SESSION_POLICY } from "../models/verification-session";
import {
  digestVerificationSessionToken,
  generateVerificationSessionToken,
  isVerificationSessionToken,
} from "./verification-session-crypto";

type VerificationSessionServiceDependencies = {
  repository: VerificationSessionRepository;
  hashSecret: string;
  now?: () => Date;
  createSessionId?: () => string;
  createToken?: () => string;
};

type IssueVerificationSession = {
  otpChallengeId: string;
  email: string;
  previousToken?: string;
};

export function createVerificationSessionService({
  repository,
  hashSecret,
  now = () => new Date(),
  createSessionId = randomUUID,
  createToken = generateVerificationSessionToken,
}: VerificationSessionServiceDependencies) {
  if (hashSecret.length < 32) {
    throw new Error(
      "Verification session hash secret must contain at least 32 characters.",
    );
  }

  const digest = (token: string) => digestVerificationSessionToken(
    token,
    hashSecret,
  );

  return {
    async issue({
      otpChallengeId,
      email,
      previousToken,
    }: IssueVerificationSession): Promise<IssuedVerificationSession> {
      const token = createToken();

      if (!isVerificationSessionToken(token)) {
        throw new Error("Verification session token has an invalid format.");
      }

      const createdAt = now();
      const expiresAt = new Date(
        createdAt.getTime() + VERIFICATION_SESSION_POLICY.lifetimeMs,
      );

      await repository.create(
        {
          id: createSessionId(),
          otpChallengeId,
          email,
          tokenDigest: digest(token),
          createdAt,
          expiresAt,
          revokedAt: null,
        },
        previousToken && isVerificationSessionToken(previousToken)
          ? digest(previousToken)
          : undefined,
      );

      return { token, expiresAt };
    },

    async find(token: string | undefined) {
      if (!token || !isVerificationSessionToken(token)) {
        return null;
      }

      return repository.findActive(digest(token), now());
    },

    async revoke(token: string | undefined) {
      if (!token || !isVerificationSessionToken(token)) {
        return;
      }

      await repository.revoke(digest(token), now());
    },

    async consume(token: string | undefined) {
      if (!token || !isVerificationSessionToken(token)) return false;
      return repository.consume(digest(token), now());
    },
  };
}

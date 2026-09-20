import { describe, expect, it } from "vitest";

import { VERIFICATION_SESSION_POLICY } from "../models/verification-session";
import { MemoryVerificationSessionRepository } from "../repositories/memory-verification-session-repository";
import { digestVerificationSessionToken } from "./verification-session-crypto";
import { createVerificationSessionService } from "./verification-session-service";

const HASH_SECRET = "verification-session-test-secret-longer-than-thirty-two";
const TOKEN = "A".repeat(43);
const SECOND_TOKEN = "B".repeat(43);
const SESSION_ID = "018f5f9a-6ad7-7d2c-8d5b-7e9c4d3a2b10";
const CHALLENGE_ID = "018f5f9a-6ad7-7d2c-8d5b-7e9c4d3a2b11";
const START = new Date("2026-09-20T12:00:00.000Z");

function testService() {
  let currentTime = START;
  let token = TOKEN;
  const repository = new MemoryVerificationSessionRepository();
  const service = createVerificationSessionService({
    repository,
    hashSecret: HASH_SECRET,
    now: () => currentTime,
    createSessionId: () => SESSION_ID,
    createToken: () => token,
  });

  return {
    repository,
    service,
    setTime: (value: Date) => { currentTime = value; },
    setToken: (value: string) => { token = value; },
  };
}

describe("verification session cryptography", () => {
  it("does not store the bearer token", async () => {
    const { repository, service } = testService();

    await service.issue({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
    });

    const digest = digestVerificationSessionToken(TOKEN, HASH_SECRET);
    expect(repository.inspect(digest)?.tokenDigest).toBe(digest);
    expect(repository.inspect(digest)?.tokenDigest).not.toContain(TOKEN);
  });
});

describe("verification session service", () => {
  it("issues a session for the verified email and challenge", async () => {
    const { service } = testService();
    const issued = await service.issue({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
    });

    expect(issued).toEqual({
      token: TOKEN,
      expiresAt: new Date(
        START.getTime() + VERIFICATION_SESSION_POLICY.lifetimeMs,
      ),
    });
    await expect(service.find(TOKEN)).resolves.toMatchObject({
      id: SESSION_ID,
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
      revokedAt: null,
    });
  });

  it("rejects a missing, malformed, unknown, or expired token", async () => {
    const { service, setTime } = testService();
    await service.issue({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
    });

    await expect(service.find(undefined)).resolves.toBeNull();
    await expect(service.find("not-a-session-token")).resolves.toBeNull();
    await expect(service.find(SECOND_TOKEN)).resolves.toBeNull();

    setTime(new Date(START.getTime() + VERIFICATION_SESSION_POLICY.lifetimeMs));
    await expect(service.find(TOKEN)).resolves.toBeNull();
  });

  it("revokes the previous browser session when it issues a replacement", async () => {
    const { service, setToken } = testService();
    await service.issue({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
    });
    setToken(SECOND_TOKEN);
    await service.issue({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
      previousToken: TOKEN,
    });

    await expect(service.find(TOKEN)).resolves.toBeNull();
    await expect(service.find(SECOND_TOKEN)).resolves.toMatchObject({
      email: "person@example.com",
    });
  });

  it("revokes a valid session", async () => {
    const { service } = testService();
    await service.issue({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
    });

    await service.revoke(TOKEN);

    await expect(service.find(TOKEN)).resolves.toBeNull();
  });
});

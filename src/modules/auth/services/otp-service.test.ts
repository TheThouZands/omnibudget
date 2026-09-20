import { describe, expect, it, vi } from "vitest";

import { OTP_POLICY, OtpError, type OtpCodeSender } from "../models/otp";
import { MemoryOtpRepository } from "../repositories/memory-otp-repository";
import { digestOtp, generateOtpCode, otpDigestMatches } from "./otp-crypto";
import { createOtpService, normalizeEmail } from "./otp-service";

const HASH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
const CHALLENGE_ID = "018f5f9a-6ad7-7d2c-8d5b-7e9c4d3a2b10";
const START = new Date("2026-09-20T12:00:00.000Z");

function developmentSender(): OtpCodeSender {
  return {
    send: vi.fn(async ({ code }) => ({ developmentCode: code })),
  };
}

function testService(options?: {
  repository?: MemoryOtpRepository;
  sender?: OtpCodeSender;
  now?: () => Date;
  code?: string;
}) {
  const repository = options?.repository ?? new MemoryOtpRepository();
  const sender = options?.sender ?? developmentSender();
  const service = createOtpService({
    repository,
    sender,
    hashSecret: HASH_SECRET,
    now: options?.now ?? (() => START),
    createChallengeId: () => CHALLENGE_ID,
    createCode: () => options?.code ?? "042731",
  });

  return { repository, sender, service };
}

describe("OTP cryptography", () => {
  it("formats a cryptographically drawn value as six digits", () => {
    expect(generateOtpCode(() => 7)).toBe("000007");
  });

  it("binds each digest to the challenge and email", () => {
    const first = digestOtp({
      challengeId: CHALLENGE_ID,
      email: "person@example.com",
      code: "042731",
      secret: HASH_SECRET,
    });
    const second = digestOtp({
      challengeId: CHALLENGE_ID,
      email: "other@example.com",
      code: "042731",
      secret: HASH_SECRET,
    });

    expect(first).not.toBe(second);
    expect(otpDigestMatches(first, first)).toBe(true);
    expect(otpDigestMatches(first, second)).toBe(false);
  });
});

describe("OTP challenge service", () => {
  it("normalizes an email without rewriting its local part", () => {
    expect(normalizeEmail("  Name+Budget@Example.COM ")).toBe("name+budget@example.com");
  });

  it.each(["", "missing-at.example.com", "name@localhost", "a".repeat(321)])(
    "rejects invalid email %j",
    (email) => {
      expect(() => normalizeEmail(email)).toThrowError(OtpError);
    },
  );

  it("issues a time-limited challenge without storing the code", async () => {
    const { repository, sender, service } = testService();
    const result = await service.issue("Person@Example.com");
    const stored = repository.inspect(CHALLENGE_ID);

    expect(result).toEqual({
      challengeId: CHALLENGE_ID,
      expiresAt: new Date(START.getTime() + OTP_POLICY.lifetimeMs).toISOString(),
      developmentCode: "042731",
    });
    expect(sender.send).toHaveBeenCalledWith({
      to: "person@example.com",
      code: "042731",
      expiresAt: new Date(START.getTime() + OTP_POLICY.lifetimeMs),
    });
    expect(stored?.codeDigest).not.toContain("042731");
    expect(stored?.attemptCount).toBe(0);
  });

  it("verifies a challenge exactly once", async () => {
    const { service } = testService();
    await service.issue("person@example.com");

    await expect(service.verify(CHALLENGE_ID, "PERSON@example.com", "042731"))
      .resolves.toEqual({
        verified: true,
        challengeId: CHALLENGE_ID,
        email: "person@example.com",
      });
    await expect(service.verify(CHALLENGE_ID, "person@example.com", "042731"))
      .rejects.toMatchObject({ code: "code_invalid_or_expired", status: 401 });
  });

  it("locks a challenge after the maximum number of wrong attempts", async () => {
    const { repository, service } = testService();
    await service.issue("person@example.com");

    for (let attempt = 0; attempt < OTP_POLICY.maxAttempts; attempt += 1) {
      await expect(service.verify(CHALLENGE_ID, "person@example.com", "000000"))
        .rejects.toMatchObject({ code: "code_invalid_or_expired" });
    }

    expect(repository.inspect(CHALLENGE_ID)).toMatchObject({
      attemptCount: OTP_POLICY.maxAttempts,
      consumedAt: START,
    });
    await expect(service.verify(CHALLENGE_ID, "person@example.com", "042731"))
      .rejects.toMatchObject({ code: "code_invalid_or_expired" });
  });

  it("rejects an expired challenge", async () => {
    let currentTime = START;
    const { service } = testService({ now: () => currentTime });
    await service.issue("person@example.com");
    currentTime = new Date(START.getTime() + OTP_POLICY.lifetimeMs);

    await expect(service.verify(CHALLENGE_ID, "person@example.com", "042731"))
      .rejects.toMatchObject({ code: "code_invalid_or_expired" });
  });

  it("limits repeated delivery requests for one email", async () => {
    let currentTime = START;
    let sequence = 0;
    const repository = new MemoryOtpRepository();
    const service = createOtpService({
      repository,
      sender: developmentSender(),
      hashSecret: HASH_SECRET,
      now: () => currentTime,
      createChallengeId: () => `018f5f9a-6ad7-7d2c-8d5b-${(++sequence).toString().padStart(12, "0")}`,
      createCode: () => "042731",
    });

    await service.issue("person@example.com");
    await expect(service.issue("person@example.com"))
      .rejects.toMatchObject({ code: "rate_limited", status: 429, retryAfterSeconds: 60 });

    currentTime = new Date(START.getTime() + OTP_POLICY.requestCooldownMs);
    await expect(service.issue("person@example.com")).resolves.toMatchObject({
      developmentCode: "042731",
    });
  });

  it("revokes a challenge when delivery fails", async () => {
    const sender: OtpCodeSender = {
      send: vi.fn(async () => { throw new Error("smtp unavailable"); }),
    };
    const { repository, service } = testService({ sender });

    await expect(service.issue("person@example.com"))
      .rejects.toMatchObject({ code: "delivery_failed", status: 502 });
    expect(repository.inspect(CHALLENGE_ID)?.consumedAt).toEqual(START);
  });
});

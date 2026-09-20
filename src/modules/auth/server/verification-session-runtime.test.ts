import { afterEach, describe, expect, it, vi } from "vitest";

import { loadVerificationSessionService } from "./verification-session-runtime";

const CHALLENGE_ID = "018f5f9a-6ad7-7d2c-8d5b-7e9c4d3a2b10";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verification session runtime modes", () => {
  it("keeps a development session available across service loads", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERIFICATION_SESSION_STORE_MODE", "memory");
    const firstService = await loadVerificationSessionService();
    const issued = await firstService.issue({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
    });
    const secondService = await loadVerificationSessionService();

    await expect(secondService.find(issued.token)).resolves.toMatchObject({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
    });
  });

  it("does not allow memory storage in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERIFICATION_SESSION_STORE_MODE", "memory");
    vi.stubEnv(
      "VERIFICATION_SESSION_HASH_SECRET",
      "production-session-secret-longer-than-thirty-two-characters",
    );

    await expect(loadVerificationSessionService()).rejects.toThrow(
      "Production verification sessions require database storage.",
    );
  });

  it("rejects an unknown storage mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERIFICATION_SESSION_STORE_MODE", "remote");

    await expect(loadVerificationSessionService()).rejects.toThrow(
      "VERIFICATION_SESSION_STORE_MODE must be one of: memory, database.",
    );
  });
});

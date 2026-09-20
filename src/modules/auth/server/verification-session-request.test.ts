import { describe, expect, it, vi } from "vitest";

import type { EmailVerificationSession } from "../models/verification-session";
import {
  findVerificationSessionForRequest,
  requireVerificationSession,
  VerificationSessionRequiredError,
  type VerificationSessionServiceLoader,
} from "./verification-session-request";

const TOKEN = "A".repeat(43);
const SESSION: EmailVerificationSession = {
  id: "018f5f9a-6ad7-7d2c-8d5b-7e9c4d3a2b10",
  otpChallengeId: "018f5f9a-6ad7-7d2c-8d5b-7e9c4d3a2b11",
  email: "person@example.com",
  tokenDigest: "a".repeat(64),
  createdAt: new Date("2026-09-20T12:00:00.000Z"),
  expiresAt: new Date("2026-09-20T12:30:00.000Z"),
  revokedAt: null,
};

function loader(): VerificationSessionServiceLoader {
  return async () => ({
    issue: vi.fn(),
    find: vi.fn(async (token) => token === TOKEN ? SESSION : null),
    revoke: vi.fn(),
  });
}

describe("verification session request guard", () => {
  it("returns the verified server-side identity for the owning browser", async () => {
    const request = new Request("http://localhost/api/auth/complete", {
      headers: { Cookie: `ob_email_verification=${TOKEN}` },
    });

    await expect(requireVerificationSession(request, loader()))
      .resolves.toEqual(SESSION);
  });

  it("does not transfer verification to another browser", async () => {
    const request = new Request("http://localhost/api/auth/complete");

    await expect(findVerificationSessionForRequest(request, loader()))
      .resolves.toBeNull();
    await expect(requireVerificationSession(request, loader()))
      .rejects.toBeInstanceOf(VerificationSessionRequiredError);
  });
});

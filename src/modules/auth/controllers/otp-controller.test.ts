import { afterEach, describe, expect, it, vi } from "vitest";

import { OtpError } from "../models/otp";
import type {
  OtpServiceLoader,
  VerificationSessionServiceLoader,
} from "./otp-controller";
import { issueOtpRequest, verifyOtpRequest } from "./otp-controller";

const CHALLENGE_ID = "018f5f9a-6ad7-7d2c-8d5b-7e9c4d3a2b10";
const PRIVATE_MARKER = "private-request-marker";
const SESSION_TOKEN = "A".repeat(43);
type OtpService = Awaited<ReturnType<OtpServiceLoader>>;

afterEach(() => {
  vi.restoreAllMocks();
});

function service(overrides?: {
  issue?: OtpService["issue"];
  verify?: OtpService["verify"];
}): OtpServiceLoader {
  return async () => ({
    issue: overrides?.issue ?? vi.fn(async () => ({
      challengeId: CHALLENGE_ID,
      expiresAt: "2026-09-20T12:10:00.000Z",
      developmentCode: "042731",
    })),
    verify: overrides?.verify ?? vi.fn(async () => ({
      verified: true as const,
      challengeId: CHALLENGE_ID,
      email: "person@example.com",
    })),
  });
}

function sessions(
  issue = vi.fn(async () => ({
    token: SESSION_TOKEN,
    expiresAt: new Date("2026-09-20T12:30:00.000Z"),
  })),
): VerificationSessionServiceLoader {
  return async () => ({
    issue,
    find: vi.fn(async () => null),
    revoke: vi.fn(async () => undefined),
  });
}

function json(path: string, body: unknown, headers?: HeadersInit) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
}

describe("OTP request endpoint", () => {
  it("returns a development challenge without caching it", async () => {
    const response = await issueOtpRequest(
      json("/api/auth/otp/request", { email: "person@example.com" }),
      service(),
    );

    expect(response.status).toBe(202);
    expectPrivate(response);
    expect(await response.json()).toEqual({
      challengeId: CHALLENGE_ID,
      expiresAt: "2026-09-20T12:10:00.000Z",
      developmentCode: "042731",
    });
  });

  it("returns a retry interval after a rate limit", async () => {
    const issue = vi.fn(async () => {
      throw new OtpError("rate_limited", 429, 37);
    });
    const response = await issueOtpRequest(
      json("/api/auth/otp/request", { email: "person@example.com" }),
      service({ issue }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(await response.json()).toEqual({ error: { code: "rate_limited" } });
  });
});

describe("OTP verification endpoint", () => {
  it("accepts an exact verification request", async () => {
    const verify = vi.fn(async () => ({
      verified: true as const,
      challengeId: CHALLENGE_ID,
      email: "person@example.com",
    }));
    const issue = vi.fn(async () => ({
      token: SESSION_TOKEN,
      expiresAt: new Date("2026-09-20T12:30:00.000Z"),
    }));
    const response = await verifyOtpRequest(
      json("/api/auth/otp/verify", {
        challengeId: CHALLENGE_ID,
        email: "person@example.com",
        code: "042731",
      }, { Cookie: `ob_email_verification=${"B".repeat(43)}` }),
      service({ verify }),
      sessions(issue),
    );

    expect(response.status).toBe(200);
    expectPrivate(response);
    expect(await response.json()).toEqual({ verified: true });
    expect(response.headers.get("set-cookie")).toContain(
      `ob_email_verification=${SESSION_TOKEN}`,
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(verify).toHaveBeenCalledWith(
      CHALLENGE_ID,
      "person@example.com",
      "042731",
    );
    expect(issue).toHaveBeenCalledWith({
      otpChallengeId: CHALLENGE_ID,
      email: "person@example.com",
      previousToken: "B".repeat(43),
    });
  });

  it("does not reveal why a code was rejected", async () => {
    const verify = vi.fn(async () => {
      throw new OtpError("code_invalid_or_expired", 401);
    });
    const response = await verifyOtpRequest(
      json("/api/auth/otp/verify", {
        challengeId: CHALLENGE_ID,
        email: "person@example.com",
        code: "000000",
      }),
      service({ verify }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "code_invalid_or_expired" },
    });
  });
});

describe("OTP request validation", () => {
  it.each([
    { body: null },
    { body: [] },
    { body: { email: 3 } },
    { body: { email: "person@example.com", unexpected: PRIVATE_MARKER } },
  ])("rejects an invalid request object %#", async ({ body }) => {
    const response = await issueOtpRequest(
      json("/api/auth/otp/request", body),
      service(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "invalid_request" } });
  });

  it("requires JSON content", async () => {
    const request = new Request("http://localhost/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: PRIVATE_MARKER,
    });
    const response = await issueOtpRequest(request, service());

    expect(response.status).toBe(415);
    expect(JSON.stringify(await response.json())).not.toContain(PRIVATE_MARKER);
  });

  it("rejects a request larger than four KiB", async () => {
    const response = await issueOtpRequest(
      json("/api/auth/otp/request", { email: `${"x".repeat(5000)}@example.com` }),
      service(),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: { code: "invalid_request" } });
  });

  it("returns a safe error for an unexpected failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const issue = vi.fn(async () => { throw new Error(PRIVATE_MARKER); });
    const response = await issueOtpRequest(
      json("/api/auth/otp/request", { email: "person@example.com" }),
      service({ issue }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: { code: "processing_failed" } });
    expect(JSON.stringify(body)).not.toContain(PRIVATE_MARKER);
  });
});

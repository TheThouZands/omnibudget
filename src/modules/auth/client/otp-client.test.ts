import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OtpClientError,
  requestOtp,
  verifyOtp,
} from "./otp-client";

const CHALLENGE_ID = "018f5f9a-6ad7-7d2c-8d5b-7e9c4d3a2b10";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OTP client", () => {
  it("requests an emulated development challenge from the server", async () => {
    const fetchMock = vi.fn(async () => Response.json({
      challengeId: CHALLENGE_ID,
      expiresAt: "2026-09-20T12:10:00.000Z",
      developmentCode: "042731",
    }, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestOtp("person@example.com")).resolves.toEqual({
      challengeId: CHALLENGE_ID,
      expiresAt: "2026-09-20T12:10:00.000Z",
      developmentCode: "042731",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/otp/request", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "person@example.com" }),
      cache: "no-store",
      credentials: "same-origin",
      signal: undefined,
    });
  });

  it("verifies a challenge and accepts the server cookie response", async () => {
    const fetchMock = vi.fn(async () => Response.json({ verified: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyOtp(
      CHALLENGE_ID,
      "person@example.com",
      "042731",
    )).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/otp/verify", expect.objectContaining({
      body: JSON.stringify({
        challengeId: CHALLENGE_ID,
        email: "person@example.com",
        code: "042731",
      }),
      credentials: "same-origin",
    }));
  });

  it("preserves a safe server error code", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { error: { code: "rate_limited" } },
      { status: 429 },
    )));

    await expect(requestOtp("person@example.com")).rejects.toEqual(
      new OtpClientError("rate_limited", 429),
    );
  });

  it("rejects an invalid success payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));

    await expect(requestOtp("person@example.com")).rejects.toMatchObject({
      code: "request_failed",
      status: 502,
    });
  });
});

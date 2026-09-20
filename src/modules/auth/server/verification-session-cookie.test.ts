import { describe, expect, it } from "vitest";

import {
  readVerificationSessionCookie,
  serializeVerificationSessionCookie,
} from "./verification-session-cookie";

const TOKEN = "A".repeat(43);
const EXPIRES_AT = new Date("2026-09-20T12:30:00.000Z");

describe("verification session cookie", () => {
  it("serializes a persistent development cookie without exposing it to scripts", () => {
    const cookie = serializeVerificationSessionCookie(
      { token: TOKEN, expiresAt: EXPIRES_AT },
      false,
    );

    expect(cookie).toContain(`ob_email_verification=${TOKEN}`);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=1800");
    expect(cookie).toContain("Expires=Sun, 20 Sep 2026 12:30:00 GMT");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Priority=High");
    expect(cookie).not.toContain("Secure");

  });

  it("uses a secure host-only cookie in production", () => {
    const cookie = serializeVerificationSessionCookie(
      { token: TOKEN, expiresAt: EXPIRES_AT },
      true,
    );

    expect(cookie).toContain(`__Host-ob_email_verification=${TOKEN}`);
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain("Domain=");

  });

  it("reads only the cookie for the current environment", () => {
    const request = new Request("http://localhost/api/auth/otp/verify", {
      headers: {
        Cookie: `other=value; ob_email_verification=${TOKEN}`,
      },
    });

    expect(readVerificationSessionCookie(request, false)).toBe(TOKEN);
    expect(readVerificationSessionCookie(request, true)).toBeUndefined();
  });
});

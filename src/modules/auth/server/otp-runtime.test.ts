import { afterEach, describe, expect, it, vi } from "vitest";

import { loadOtpService } from "./otp-runtime";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("OTP runtime modes", () => {
  it("emulates delivery with process-local storage during development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTP_STORE_MODE", "memory");
    vi.stubEnv("OTP_DELIVERY_MODE", "emulated");
    const service = await loadOtpService();
    const email = `runtime-${crypto.randomUUID()}@example.com`;
    const issued = await service.issue(email);

    expect(issued.developmentCode).toMatch(/^\d{6}$/);
    await expect(service.verify(
      issued.challengeId,
      email,
      issued.developmentCode!,
    )).resolves.toEqual({ verified: true, email });
  });

  it("does not allow emulated delivery or memory storage in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTP_STORE_MODE", "memory");
    vi.stubEnv("OTP_DELIVERY_MODE", "emulated");
    vi.stubEnv("OTP_HASH_SECRET", "production-test-secret-longer-than-thirty-two-characters");

    await expect(loadOtpService()).rejects.toThrow(
      "Production OTP requires database storage and SMTP delivery.",
    );
  });

  it("rejects an unknown runtime mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTP_STORE_MODE", "remote");

    await expect(loadOtpService()).rejects.toThrow(
      "OTP_STORE_MODE must be one of: memory, database.",
    );
  });
});

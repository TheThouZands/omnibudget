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
    )).resolves.toEqual({
      verified: true,
      challengeId: issued.challengeId,
      email,
    });
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

  it("validates the configured SMTP port before it creates a sender", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTP_STORE_MODE", "memory");
    vi.stubEnv("OTP_DELIVERY_MODE", "smtp");
    vi.stubEnv("SMTP_HOST", "mail.example.com");
    vi.stubEnv("SMTP_PORT", "70000");
    vi.stubEnv("SMTP_SECURE", "true");
    vi.stubEnv("SMTP_USER", "access@example.com");
    vi.stubEnv("SMTP_PASSWORD", "private-app-password");

    await expect(loadOtpService()).rejects.toThrow(
      "SMTP_PORT must be an integer from 1 through 65535.",
    );
  });

  it("validates the configured SMTP security flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTP_STORE_MODE", "memory");
    vi.stubEnv("OTP_DELIVERY_MODE", "smtp");
    vi.stubEnv("SMTP_HOST", "mail.example.com");
    vi.stubEnv("SMTP_PORT", "465");
    vi.stubEnv("SMTP_SECURE", "sometimes");
    vi.stubEnv("SMTP_USER", "access@example.com");
    vi.stubEnv("SMTP_PASSWORD", "private-app-password");

    await expect(loadOtpService()).rejects.toThrow(
      "SMTP_SECURE must be true or false.",
    );
  });
});

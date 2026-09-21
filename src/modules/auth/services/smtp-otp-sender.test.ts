import { beforeEach, describe, expect, it, vi } from "vitest";

const mail = vi.hoisted(() => ({
  sendMail: vi.fn(async () => ({ messageId: "test-message" })),
  createTransport: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: mail.createTransport },
}));

import { createSmtpOtpSender } from "./smtp-otp-sender";

describe("SMTP OTP sender", () => {
  beforeEach(() => {
    mail.sendMail.mockClear();
    mail.createTransport.mockReset().mockReturnValue({ sendMail: mail.sendMail });
  });

  it("uses the configured authenticated transport and sends only the code", async () => {
    const sender = createSmtpOtpSender({
      host: "mail.example.com",
      port: 2465,
      secure: true,
      user: "access@example.com",
      password: "private-app-password",
      from: "Omnibudget <access@example.com>",
    });
    const result = await sender.send({
      to: "person@example.com",
      code: "042731",
      expiresAt: new Date("2026-09-20T17:10:00.000Z"),
    });

    expect(mail.createTransport).toHaveBeenCalledWith({
      host: "mail.example.com",
      port: 2465,
      secure: true,
      auth: {
        user: "access@example.com",
        pass: "private-app-password",
      },
    });
    expect(mail.sendMail).toHaveBeenCalledOnce();
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "Omnibudget <access@example.com>",
      to: "person@example.com",
      subject: "Su código de acceso a Omnibudget",
      text: expect.stringContaining("042731"),
      html: expect.stringMatching(/<p dir="ltr"[^>]*>042731<\/p>/),
    }));
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("hora de Colombia"),
      html: expect.stringContaining("hora de Colombia"),
    }));
    expect(result).toEqual({});
  });

  it("propagates SMTP errors so the OTP service can revoke the challenge", async () => {
    const failure = new Error("SMTP unavailable");
    mail.sendMail.mockRejectedValueOnce(failure);
    const sender = createSmtpOtpSender({
      host: "mail.example.com",
      port: 465,
      secure: true,
      user: "access@example.com",
      password: "private-app-password",
      from: "Omnibudget <access@example.com>",
    });

    await expect(sender.send({
      to: "person@example.com",
      code: "042731",
      expiresAt: new Date("2026-09-20T17:10:00.000Z"),
    })).rejects.toBe(failure);
  });
});

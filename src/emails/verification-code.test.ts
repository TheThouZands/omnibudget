import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

import { renderVerificationCodeEmail } from "./verification-code";

const example = {
  code: "042731",
  expiresAt: new Date("2026-09-20T17:10:00.000Z"),
};

describe("verification code email", () => {
  it("keeps a contiguous code with its leading zero in both alternatives", () => {
    const email = renderVerificationCodeEmail(example);

    expect(email.text.split("\n")[0]).toBe("Su código de verificación de Omnibudget es: 042731.");
    expect(email.html).toMatch(/<p dir="ltr"[^>]*>042731<\/p>/);
    expect(email.html).toContain(email.text.split("\n")[0]);
    expect(email.subject).not.toContain(example.code);
  });

  it("uses the actual expiry in Colombia time in both alternatives", () => {
    const email = renderVerificationCodeEmail(example);

    for (const content of [email.text, email.html]) {
      expect(content).toContain("Vence a las 12:10 (hora de Colombia).");
      expect(content).toContain("la ventana donde lo solicitó");
      expect(content).toContain("No lo comparta.");
      expect(content).toContain("Si no solicitó este código");
    }
  });

  it("renders midnight without an ambiguous 12-hour time", () => {
    const email = renderVerificationCodeEmail({
      ...example,
      expiresAt: new Date("2026-09-21T05:05:00.000Z"),
    });

    expect(email.text).toContain("00:05 (hora de Colombia)");
  });

  it("uses self-contained inline styles without scripts, links or remote assets", () => {
    const { html } = renderVerificationCodeEmail(example);

    expect(html).toContain('<html lang="es"');
    expect(html).toContain('role="presentation"');
    expect(html).toContain('style="');
    expect(html).not.toMatch(/<(script|style|link|img|svg|form|a)\b|https?:\/\/|url\(/i);
    expect(Buffer.byteLength(html, "utf8")).toBeLessThan(10_000);
  });

  it("builds a UTF-8 multipart message without contacting an SMTP server", async () => {
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const result = await transport.sendMail({
      from: "Omnibudget <access@example.com>",
      to: "person@example.com",
      ...renderVerificationCodeEmail(example),
    });
    const message = result.message.toString("utf8");

    expect(message).toContain("Content-Type: multipart/alternative;");
    expect(message).toContain("Content-Type: text/plain; charset=utf-8");
    expect(message).toContain("Content-Type: text/html; charset=utf-8");
    expect(message).toContain(example.code);
    expect(message).not.toContain("Content-Disposition: attachment");
  });

  it.each(["", "12345", "1234567", "123 45", "abcdef", "<img src=x>", "１２３４５６"])(
    "rejects invalid code %j without putting it in the error message",
    (code) => {
      expect(() => renderVerificationCodeEmail({ ...example, code })).toThrow(
        "Invalid verification email data",
      );
    },
  );

  it("rejects an invalid expiry", () => {
    expect(() => renderVerificationCodeEmail({ ...example, expiresAt: new Date(NaN) })).toThrow(
      "Invalid verification email data",
    );
  });
});

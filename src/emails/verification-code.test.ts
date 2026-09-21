import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

import { renderVerificationCodeEmail } from "./verification-code";

const example = {
  code: "042731",
  expiresInMinutes: 10,
};

describe("verification code email", () => {
  it("keeps a contiguous code with its leading zero in both alternatives", () => {
    const email = renderVerificationCodeEmail(example);

    expect(email.text.split("\n")[0]).toBe("Su código de acceso a Omnibudget es: 042731.");
    expect(email.html).toMatch(/<p dir="ltr"[^>]*>042731<\/p>/);
    expect(email.html).toContain(email.text.split("\n")[0]);
    expect(email.subject).not.toContain(example.code);
  });

  it("keeps both alternatives limited to the code, lifetime and ignore notice", () => {
    const email = renderVerificationCodeEmail(example);

    for (const content of [email.text, email.html]) {
      expect(content).toContain("Vence en 10 minutos.");
      expect(content).not.toContain("la ventana donde lo solicitó");
      expect(content).not.toContain("hora de Colombia");
      expect(content).not.toContain("No lo comparta.");
      expect(content).toContain("Si no solicitó este código");
    }
  });

  it("supports a different configured lifetime and singular wording", () => {
    const email = renderVerificationCodeEmail({
      ...example,
      expiresInMinutes: 1,
    });

    expect(email.text).toContain("Vence en 1 minuto.");
    expect(email.html).toContain("Vence en 1 minuto.");
  });

  it("uses inline styles and embedded images without scripts, links or remote assets", () => {
    const { html } = renderVerificationCodeEmail(example);

    expect(html).toContain('<html lang="es"');
    expect(html).toContain('role="presentation"');
    expect(html).toContain('style="');
    expect(html).not.toMatch(/<(script|style|link|svg|form|a)\b|https?:\/\/|data:image/i);
    expect(html).toContain('src="cid:logo@omnibudget.invalid"');
    expect(html).toContain('background="cid:guilloche@omnibudget.invalid"');
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
    expect(message).toContain("Content-Type: multipart/related;");
    expect(message).toContain("Content-Type: text/plain; charset=utf-8");
    expect(message).toContain("Content-Type: text/html; charset=utf-8");
    expect(message).toContain(example.code);
    expect(message).not.toContain("Content-Disposition: attachment");
    expect(message.match(/Content-Type: image\/png;/g)).toHaveLength(2);
    expect(message).toContain("Content-ID: <logo@omnibudget.invalid>");
    expect(message).toContain("Content-ID: <guilloche@omnibudget.invalid>");
    expect(Buffer.byteLength(message)).toBeLessThan(150_000);
  });

  it.each(["", "12345", "1234567", "123 45", "abcdef", "<img src=x>", "１２３４５６"])(
    "rejects invalid code %j without putting it in the error message",
    (code) => {
      expect(() => renderVerificationCodeEmail({ ...example, code })).toThrow(
        "Invalid verification email data",
      );
    },
  );

  it.each([0, -1, NaN, Infinity, 1.5])("rejects an invalid lifetime %j", (expiresInMinutes) => {
    expect(() => renderVerificationCodeEmail({ ...example, expiresInMinutes })).toThrow(
      "Invalid verification email data",
    );
  });
});

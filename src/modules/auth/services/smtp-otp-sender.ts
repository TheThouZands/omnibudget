import nodemailer from "nodemailer";

import { renderVerificationCodeEmail } from "@/emails/verification-code";

import { OTP_POLICY, type OtpCodeSender } from "../models/otp";

export type SmtpOtpSenderOptions = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

export function createSmtpOtpSender({
  host,
  port,
  secure,
  user,
  password,
  from,
}: SmtpOtpSenderOptions): OtpCodeSender {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
  });

  return {
    async send({ to, code }) {
      await transporter.sendMail({
        from,
        to,
        ...renderVerificationCodeEmail({ code, expiresInMinutes: OTP_POLICY.lifetimeMs / 60_000 }),
      });

      return {};
    },
  };
}

import nodemailer from "nodemailer";

import { renderVerificationCodeEmail } from "@/emails/verification-code";

import type { OtpCodeSender } from "../models/otp";

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
    async send({ to, code, expiresAt }) {
      await transporter.sendMail({
        from,
        to,
        ...renderVerificationCodeEmail({ code, expiresAt }),
      });

      return {};
    },
  };
}

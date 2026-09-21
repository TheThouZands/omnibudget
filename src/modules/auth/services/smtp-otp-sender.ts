import nodemailer from "nodemailer";

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
        subject: "Su código de acceso a Omnibudget",
        text: [
          `Su código de acceso es: ${code}`,
          "",
          `El código vence a las ${expiresAt.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Bogota",
          })} (hora de Colombia).`,
          "",
          "Si no solicitó este código, ignore este mensaje.",
        ].join("\n"),
      });

      return {};
    },
  };
}

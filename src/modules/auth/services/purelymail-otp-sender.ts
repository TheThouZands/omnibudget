import nodemailer from "nodemailer";

import type { OtpCodeSender } from "../models/otp";

type PurelymailOtpSenderOptions = {
  user: string;
  password: string;
  from: string;
};

export function createPurelymailOtpSender({
  user,
  password,
  from,
}: PurelymailOtpSenderOptions): OtpCodeSender {
  const transporter = nodemailer.createTransport({
    host: "smtp.purelymail.com",
    port: 465,
    secure: true,
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

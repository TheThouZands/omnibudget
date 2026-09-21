import { escapeEmailHtml, renderEmailLayout, type RenderedEmail } from "./layout";
import { emailStyles as styles } from "./styles";

const expiryTime = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Bogota",
});

export function renderVerificationCodeEmail({
  code,
  expiresAt,
}: {
  code: string;
  expiresAt: Date;
}): RenderedEmail {
  if (!/^[0-9]{6}$/.test(code) || !Number.isFinite(expiresAt.getTime())) {
    throw new Error("Invalid verification email data");
  }

  const subject = "Su código de acceso a Omnibudget";
  const preview = `Su código de verificación de Omnibudget es: ${code}.`;
  const instruction = "Para continuar, escriba este código en la ventana donde lo solicitó.";
  const expiry = `Vence a las ${expiryTime.format(expiresAt)} (hora de Colombia).`;
  const security = "Use el código solo en Omnibudget. No lo comparta.";
  const unsolicited = "Si no solicitó este código, puede ignorar este mensaje.";

  return {
    subject,
    text: [preview, "", instruction, expiry, "", security, "", unsolicited].join("\n"),
    html: renderEmailLayout({
      title: subject,
      preview,
      contentHtml: `
                <h1 style="${styles.heading}">Confirme su correo.</h1>
                <p style="${styles.paragraph}">${escapeEmailHtml(instruction)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${styles.table}">
                  <tr>
                    <td style="${styles.codeBox}">
                      <p style="${styles.codeLabel}">Código de verificación</p>
                      <p dir="ltr" style="${styles.code}">${escapeEmailHtml(code)}</p>
                    </td>
                  </tr>
                </table>
                <p style="${styles.expiry}">${escapeEmailHtml(expiry)}</p>
                <p style="${styles.note}">${escapeEmailHtml(security)}</p>
                <p style="${styles.footer}">${escapeEmailHtml(unsolicited)}</p>`,
    }),
  };
}

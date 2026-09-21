import { createEmailImages } from "./assets";
import { escapeEmailHtml, renderEmailLayout, type RenderedEmail } from "./layout";
import { emailStyles as styles } from "./styles";

export function renderVerificationCodeEmail({
  code,
  expiresInMinutes,
}: {
  code: string;
  expiresInMinutes: number;
}): RenderedEmail {
  if (!/^[0-9]{6}$/.test(code) || !Number.isInteger(expiresInMinutes) || expiresInMinutes <= 0) {
    throw new Error("Invalid verification email data");
  }

  const subject = "Su código de acceso a Omnibudget";
  const preview = `Su código de acceso a Omnibudget es: ${code}.`;
  const expiry = `Vence en ${expiresInMinutes} ${expiresInMinutes === 1 ? "minuto" : "minutos"}.`;
  const unsolicited = "Si no solicitó este código, puede ignorar este mensaje.";

  return {
    subject,
    attachments: createEmailImages(),
    text: [preview, "", expiry, "", unsolicited].join("\n"),
    html: renderEmailLayout({
      title: subject,
      preview,
      contentHtml: `
                <h1 style="${styles.heading}">Su código de acceso</h1>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${styles.table}">
                  <tr>
                    <td style="${styles.codeBox}">
                      <p dir="ltr" style="${styles.code}">${escapeEmailHtml(code)}</p>
                    </td>
                  </tr>
                </table>
                <p style="${styles.expiry}">${escapeEmailHtml(expiry)}</p>
                <p style="${styles.footer}">${escapeEmailHtml(unsolicited)}</p>`,
    }),
  };
}

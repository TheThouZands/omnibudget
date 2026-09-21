import { emailImageIds, type InlineEmailImage } from "./assets";
import { emailStyles as styles } from "./styles";

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
  attachments: InlineEmailImage[];
};

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderEmailLayout({
  title,
  preview,
  contentHtml,
}: {
  title: string;
  preview: string;
  // Only markup from repository templates; escape interpolated values first.
  contentHtml: string;
}): string {
  return `<!doctype html>
<html lang="es" dir="ltr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
    <title>${escapeEmailHtml(title)}</title>
  </head>
  <body style="${styles.body}">
    <div aria-hidden="true" style="${styles.preview}">${escapeEmailHtml(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${styles.table}">
      <tr>
        <td align="center" style="${styles.page}">
          <!--[if mso]><table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" background="cid:${emailImageIds.guilloche}" style="${styles.table}${styles.card}background-image:url('cid:${emailImageIds.guilloche}');">
            <tr>
              <td style="${styles.content}">
                <p style="${styles.brand}"><img src="cid:${emailImageIds.logo}" width="220" height="49" alt="OmniBudget" style="${styles.logo}"></p>
                ${contentHtml}
              </td>
            </tr>
          </table>
          <!--[if mso]></td></tr></table><![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

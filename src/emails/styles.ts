// Email styles are separate from the website and inserted inline when rendered.
// System fonts and presentation tables also work without external assets.
export const emailStyles = {
  body: "margin:0;padding:0;background-color:#f0e9e2;color:#0a2010;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;",
  table: "border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;",
  page: "padding:32px 12px;",
  card: "width:100%;max-width:520px;background-color:#fbf8f4;border:1px solid #ccc3ba;background-position:center top;background-repeat:no-repeat;background-size:520px 440px;",
  content: "padding:32px 24px;",
  preview: "display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;",
  brand: "margin:0 0 28px;padding:0 0 24px;border-bottom:1px solid #ccc3ba;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:42px;font-weight:400;",
  logo: "display:block;width:220px;max-width:100%;height:auto;border:0;color:#0a2010;font-family:Georgia,'Times New Roman',serif;font-size:32px;",
  heading: "margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;font-weight:400;",
  codeBox: "padding:20px 12px;border:1px solid #ccc3ba;background-color:#f0e9e2;text-align:center;",
  code: "margin:0;font-family:'Courier New',Courier,monospace;font-size:36px;line-height:44px;font-weight:700;letter-spacing:6px;color:#0a2010;white-space:nowrap;",
  expiry: "margin:12px 0 0;font-size:13px;line-height:20px;color:#505b50;",
  footer: "margin:24px 0 0;padding:20px 0 0;border-top:1px solid #ccc3ba;font-size:13px;line-height:20px;color:#505b50;",
} as const;

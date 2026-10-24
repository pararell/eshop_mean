// Shared building blocks of the transactional emails (order-email.ts, contact-email.ts).
//
// Hand-written, table-based HTML with inline styles: what Gmail, Outlook (Word engine), Apple Mail
// and mobile clients render alike. No MJML or template engine: no runtime dependency, and the
// server bundle (esbuild) stays simple. Max width 600 px; one column on phones.
//
// Dark mode: `color-scheme` meta + a `prefers-color-scheme` block for clients that support it
// (Apple Mail, iOS, Outlook.com); Gmail and Outlook invert colors themselves, which works because
// there is no text in images and the logo is plain text with a blaze built from table cells.

import type { LanguageCode } from '@eshop/shared';

/** The shop as emails show it */
export interface EmailShop {
  name: string;
  /** Absolute shop URL without a trailing slash (ORIGIN) */
  url: string;
  /** Accent (buttons, totals); readable with `onAccent` */
  accent: string;
  onAccent: string;
  /** Shown as "Questions? Write to …" */
  contactEmail?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Escapes text for HTML element content and attribute values */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const LOCALES: Record<LanguageCode, string> = { en: 'en-GB', sk: 'sk-SK', cs: 'cs-CZ' };

export const formatMoney = (amount: number, currency: string, lang: LanguageCode): string => {
  try {
    return new Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
};

export const formatDate = (date: Date, lang: LanguageCode): string =>
  new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' }).format(date);

/** A small JPEG for email clients (no WebP/AVIF in Outlook): Cloudinary transformation, other URLs as they are */
export const emailImageUrl = (url: string | undefined, size = 160): string => {
  if (!url) return '';
  return url.includes('res.cloudinary.com') && url.includes('/upload/')
    ? url.replace('/upload/', `/upload/c_pad,b_white,w_${size},h_${size},f_jpg,q_80/`)
    : url;
};

/** Black or white, whichever reads better on `hex` */
export const readableOn = (hex: string): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.179 ? '#111111' : '#ffffff';
};

// Palette (light; the dark block below overrides it where the client allows)
export const C = {
  page: '#f2f2f0',
  card: '#ffffff',
  text: '#111111',
  muted: '#5c5c5c',
  border: '#e2e2df',
  soft: '#f7f7f5',
  trailRed: '#c8102e',
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** A button that also works in Outlook (padding on the cell, not only on the link) */
export const button = (href: string, label: string, shop: EmailShop): string => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px">
  <tr>
    <td class="btn" bgcolor="${shop.accent}" style="background:${shop.accent};border-radius:2px">
      <a class="btn-link" href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;line-height:1;color:${shop.onAccent};text-decoration:none">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;

/** A labelled block (address, payment, …) */
export const infoBlock = (label: string, bodyHtml: string): string => `
<p class="muted" style="margin:0 0 4px;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${C.muted}">${escapeHtml(label)}</p>
<p style="margin:0 0 20px;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.text}">${bodyHtml}</p>`;

export const paragraph = (html: string, style = ''): string =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.55;color:${C.text};${style}">${html}</p>`;

export const heading = (text: string): string =>
  `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:26px;line-height:1.2;font-weight:600;color:${C.text}">${escapeHtml(text)}</h1>`;

/** The shop name with the trail blaze (white–red–white), built from table cells: no image, works on dark backgrounds */
const logo = (shop: EmailShop): string => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding-right:10px;vertical-align:middle">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #d0d0cc">
        <tr><td width="26" height="5" bgcolor="#ffffff" style="font-size:0;line-height:0;background:#ffffff">&nbsp;</td></tr>
        <tr><td width="26" height="6" bgcolor="${C.trailRed}" style="font-size:0;line-height:0;background:${C.trailRed}">&nbsp;</td></tr>
        <tr><td width="26" height="5" bgcolor="#ffffff" style="font-size:0;line-height:0;background:#ffffff">&nbsp;</td></tr>
      </table>
    </td>
    <td style="vertical-align:middle">
      <a href="${escapeHtml(shop.url)}" style="font-family:${FONT};font-size:22px;font-weight:600;color:${C.text};text-decoration:none">${escapeHtml(shop.name)}</a>
    </td>
  </tr>
</table>`;

/**
 * The whole email: header with the shop name, the content card and a footer.
 * `preheader` is the preview line inbox lists show next to the subject.
 */
export function layout(opts: { lang: LanguageCode; title: string; preheader: string; content: string; footer: string; shop: EmailShop }): string {
  const { lang, title, preheader, content, footer, shop } = opts;
  return `<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  img { border: 0; display: block; }
  a { color: inherit; }
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .pad { padding-left: 20px !important; padding-right: 20px !important; }
    .item-img { width: 56px !important; }
    .item-img img { width: 56px !important; height: 56px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .bg-page { background: #0f0f0f !important; }
    .bg-card { background: #1a1a1a !important; }
    .bg-soft { background: #242424 !important; }
    h1, p, td, a, span { color: #f2f2f0 !important; }
    .muted, .muted * { color: #a3a3a0 !important; }
    .line { border-color: #3d3d3d !important; }
    .btn { background: #f2f2f0 !important; }
    .btn-link { color: #111111 !important; }
  }
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background:${C.page}">
  <tr>
    <td align="center" style="padding:24px 12px">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px">
        <tr><td class="pad" style="padding:8px 32px 20px">${logo(shop)}</td></tr>
        <tr>
          <td class="bg-card pad" style="background:${C.card};padding:36px 32px;border-top:3px solid ${shop.accent}">
            ${content}
          </td>
        </tr>
        <tr>
          <td class="pad muted" style="padding:20px 32px;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.muted}">
            ${footer}
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

export { FONT };

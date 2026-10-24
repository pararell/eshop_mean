import type { LanguageCode } from '@eshop/shared';

import { emailCopy } from './email-copy';
import { EmailShop, escapeHtml, heading, infoBlock, layout, paragraph, RenderedEmail } from './email-layout';

export interface ContactEmailData {
  lang: LanguageCode;
  name?: string;
  email: string;
  message?: string;
}

/** Contact form: a copy for the sender, a notice for the admins (reply goes to the sender) */
export function renderContactEmail(data: ContactEmailData, audience: 'customer' | 'admin', shop: EmailShop): RenderedEmail {
  const t = emailCopy(data.lang);
  const name = data.name?.trim();
  const message = data.message?.trim() ?? '';
  const sender = name ? `${name} <${data.email}>` : data.email;
  const subject = audience === 'admin' ? t.adminContactSubject(name || data.email) : t.contactSubject(shop.name);
  const title = audience === 'admin' ? t.adminContactTitle : t.contactTitle;

  const content =
    heading(title) +
    (audience === 'admin'
      ? infoBlock(t.replyTo, `<a href="mailto:${escapeHtml(data.email)}">${escapeHtml(sender)}</a>`)
      : paragraph(escapeHtml(t.greeting(name))) + paragraph(escapeHtml(t.contactIntro))) +
    (message ? infoBlock(audience === 'admin' ? t.message : t.yourMessage, escapeHtml(message).replace(/\n/g, '<br>')) : '');

  const footer =
    (audience === 'customer' && shop.contactEmail ? `${t.questions(escapeHtml(shop.contactEmail))}<br>` : '') +
    `${escapeHtml(t.footer(shop.name))}<br><a href="${escapeHtml(shop.url)}">${escapeHtml(shop.url.replace(/^https?:\/\//, ''))}</a>`;

  const html = layout({
    lang: data.lang,
    title: subject,
    preheader: audience === 'admin' ? sender : t.contactIntro.charAt(0).toUpperCase() + t.contactIntro.slice(1),
    content,
    footer,
    shop,
  });

  const text = [
    title,
    '',
    ...(audience === 'admin' ? [`${t.replyTo}: ${sender}`] : [t.greeting(name), t.contactIntro]),
    ...(message ? ['', `${audience === 'admin' ? t.message : t.yourMessage}:`, message] : []),
    '',
    '--',
    `${shop.name} · ${shop.url}`,
  ].join('\n');

  return { subject, html, text };
}

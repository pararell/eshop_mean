// npm run email:preview: renders every email (order and contact, customer and admin, en/sk/cs)
// with sample data into test-results/email-preview/, plus an index.html to open in a browser.
// Nothing is sent. Light/dark: switch the OS or browser color scheme.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { languages } from '../src/shared/constans';
import { renderContactEmail } from '../src/shared/utils/email/contact-email';
import type { RenderedEmail } from '../src/shared/utils/email/email-layout';
import { sampleContact, sampleOrder, sampleShop } from '../src/shared/utils/email/email-samples';
import { renderOrderEmail } from '../src/shared/utils/email/order-email';

const out = resolve(__dirname, '../../test-results/email-preview');
mkdirSync(out, { recursive: true });

const emails: [string, RenderedEmail][] = [];
for (const lang of languages) {
  emails.push([`order-customer-card-${lang}`, renderOrderEmail(sampleOrder(lang), 'customer', sampleShop)]);
  emails.push([`order-customer-cod-${lang}`, renderOrderEmail(sampleOrder(lang, 'PAYMENT_ON_DELIVERY'), 'customer', sampleShop)]);
  emails.push([`order-admin-${lang}`, renderOrderEmail(sampleOrder(lang), 'admin', sampleShop)]);
  emails.push([`contact-customer-${lang}`, renderContactEmail(sampleContact(lang), 'customer', sampleShop)]);
  emails.push([`contact-admin-${lang}`, renderContactEmail(sampleContact(lang), 'admin', sampleShop)]);
}

for (const [name, email] of emails) {
  writeFileSync(resolve(out, `${name}.html`), email.html);
  writeFileSync(resolve(out, `${name}.txt`), `Subject: ${email.subject}\n\n${email.text}\n`);
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
writeFileSync(
  resolve(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Email preview</title><body style="font-family:system-ui;max-width:760px;margin:40px auto">
<h1>Email preview</h1><ul>${emails
    .map(([name, e]) => `<li><a href="${name}.html">${name}</a> (<a href="${name}.txt">text</a>): ${esc(e.subject)}</li>`)
    .join('')}</ul>`,
);
console.log(`Wrote ${emails.length} emails to ${out}/index.html`);

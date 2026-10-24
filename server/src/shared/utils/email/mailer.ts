import type { RenderedEmail } from './email-layout';
import { EmailMessage, mailTransport } from './resend-transport';

/** `ADMIN_EMAILS`, comma-separated */
export const adminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

export interface OutgoingEmail extends RenderedEmail {
  to: string[];
  replyTo?: string;
}

/**
 * Sends rendered emails: one message per recipient (nobody sees the others' addresses), all in one
 * Resend request. `idempotencyKey` makes a repeated call within 24 hours a no-op at Resend.
 * Never throws.
 */
export const sendEmails = async (emails: OutgoingEmail[], idempotencyKey?: string) => {
  const from = process.env.EMAIL_FROM ?? '';
  const seen = new Set<string>();
  const messages: EmailMessage[] = [];
  for (const email of emails) {
    for (const to of email.to.map((address) => address.trim()).filter(Boolean)) {
      if (seen.has(to.toLowerCase())) continue;
      seen.add(to.toLowerCase());
      messages.push({ from, to, subject: email.subject, html: email.html, text: email.text, ...(email.replyTo ? { reply_to: email.replyTo } : {}) });
    }
  }
  return mailTransport.send(messages, idempotencyKey);
};

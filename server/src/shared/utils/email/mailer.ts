import { getContent } from './email-utils';
import type { EmailTranslations, EmailType } from './email.types';
import { mailTransport } from './resend-transport';

/** `ADMIN_EMAILS`, comma-separated */
export const adminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

/**
 * Sends the same email to each recipient (one message per recipient, so nobody sees the others'
 * addresses) in one Resend request. `idempotencyKey` makes a repeated call within 24 hours a no-op
 * at Resend. Never throws.
 */
export const sendMail = async (recipients: string[], emailType: EmailType, translations: EmailTranslations, idempotencyKey?: string) => {
  const to = [...new Set(recipients.map((email) => email.trim()).filter(Boolean))];
  const html = getContent(emailType, translations) ?? '';
  return mailTransport.send(
    to.map((email) => ({ from: process.env.EMAIL_FROM ?? '', to: email, subject: emailType.subject, html })),
    idempotencyKey,
  );
};

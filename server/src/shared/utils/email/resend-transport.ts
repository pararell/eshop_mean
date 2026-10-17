import { Logger } from '@nestjs/common';

/** One email as Resend's API takes it */
export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
}

const logger = new Logger('Email');
const TIMEOUT_MS = 10_000;
let warnedDisabled = false;

/**
 * Resend (https://resend.com/docs/api-reference) over plain `fetch`: one message → `POST /emails`,
 * several → `POST /emails/batch` (one request, so the API rate limit isn't hit by an order's
 * customer + admin emails). Read from the environment on every call:
 * - `RESEND_API_KEY` and `EMAIL_FROM` (a sender on a domain verified in Resend); without them
 *   nothing is sent and a warning is logged once;
 * - `RESEND_API_BASE` (tests and the e2e server only) points at a local stub.
 *
 * Never throws: email problems are logged and must not fail an order or a contact request.
 * Returns the Resend ids, or null when nothing was sent.
 */
async function sendViaResend(messages: EmailMessage[], idempotencyKey?: string): Promise<string[] | null> {
  if (!messages.length) return [];
  const key = process.env.RESEND_API_KEY;
  if (!key || !process.env.EMAIL_FROM) {
    if (!warnedDisabled) {
      logger.warn('Emails are disabled: RESEND_API_KEY or EMAIL_FROM is not set');
      warnedDisabled = true;
    }
    return null;
  }
  const base = (process.env.RESEND_API_BASE || 'https://api.resend.com').replace(/\/$/, '');
  const batch = messages.length > 1;
  const url = `${base}/emails${batch ? '/batch' : ''}`;
  const init = (): RequestInit => ({
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: JSON.stringify(batch ? messages : messages[0]),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  try {
    let response = await fetch(url, init());
    if (response.status === 429) {
      // Rate limited: wait as asked (at most a few seconds) and try once more
      const wait = Math.min(Number(response.headers.get('retry-after')) || 1, 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, wait));
      response = await fetch(url, init());
    }
    const body = (await response.json().catch(() => ({}))) as { id?: string; data?: { id: string }[]; message?: string; name?: string };
    if (!response.ok) {
      logger.error(`Resend refused ${messages.length} email(s): HTTP ${response.status} ${body.name ?? ''} ${body.message ?? ''}`.trim());
      return null;
    }
    return batch ? (body.data ?? []).map((item) => item.id) : body.id ? [body.id] : [];
  } catch (error) {
    logger.error(`Sending ${messages.length} email(s) failed: ${(error as Error).message}`);
    return null;
  }
}

/** Indirection so tests can replace the transport (`jest.spyOn(mailTransport, 'send')`) */
export const mailTransport = { send: sendViaResend };

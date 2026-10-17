import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { EmailMessage, mailTransport } from './resend-transport';

interface Received {
  path: string;
  headers: IncomingMessage['headers'];
  body: unknown;
}

/** A local stand-in for api.resend.com */
async function resendStub(replies: { status: number; body: unknown; headers?: Record<string, string> }[]) {
  const received: Received[] = [];
  const server: Server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      received.push({ path: req.url ?? '', headers: req.headers, body: raw ? JSON.parse(raw) : undefined });
      const reply = replies[Math.min(received.length, replies.length) - 1];
      res.writeHead(reply.status, { 'content-type': 'application/json', ...reply.headers });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    received,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const message = (to: string): EmailMessage => ({ from: 'Shop <shop@test.dev>', to, subject: 'Order', html: '<p>Thanks</p>' });

describe('Resend transport', () => {
  const env = { ...process.env };
  let stub: Awaited<ReturnType<typeof resendStub>> | undefined;

  afterEach(async () => {
    await stub?.stop();
    stub = undefined;
    process.env = { ...env };
  });

  const useStub = async (replies: Parameters<typeof resendStub>[0]) => {
    stub = await resendStub(replies);
    Object.assign(process.env, { RESEND_API_KEY: 're_test_key', EMAIL_FROM: 'Shop <shop@test.dev>', RESEND_API_BASE: stub.url });
    return stub;
  };

  it('sends one message to /emails with the key as a bearer token', async () => {
    const { received } = await useStub([{ status: 200, body: { id: 'em_1' } }]);

    await expect(mailTransport.send([message('a@test.dev')], 'order-1')).resolves.toEqual(['em_1']);

    expect(received[0].path).toBe('/emails');
    expect(received[0].headers.authorization).toBe('Bearer re_test_key');
    expect(received[0].headers['idempotency-key']).toBe('order-1');
    expect(received[0].body).toEqual(message('a@test.dev'));
  });

  it('sends several messages in one /emails/batch request', async () => {
    const { received } = await useStub([{ status: 200, body: { data: [{ id: 'em_1' }, { id: 'em_2' }] } }]);

    await expect(mailTransport.send([message('a@test.dev'), message('b@test.dev')])).resolves.toEqual(['em_1', 'em_2']);

    expect(received).toHaveLength(1);
    expect(received[0].path).toBe('/emails/batch');
    expect(received[0].body).toEqual([message('a@test.dev'), message('b@test.dev')]);
    expect(received[0].headers['idempotency-key']).toBeUndefined();
  });

  it('waits and retries once when rate limited', async () => {
    const { received } = await useStub([
      { status: 429, body: { name: 'rate_limit_exceeded', message: 'Too many requests' }, headers: { 'retry-after': '1' } },
      { status: 200, body: { id: 'em_1' } },
    ]);

    await expect(mailTransport.send([message('a@test.dev')])).resolves.toEqual(['em_1']);
    expect(received).toHaveLength(2);
  });

  it('logs and returns null when Resend refuses (e.g. an unverified sender domain), never throws', async () => {
    await useStub([{ status: 403, body: { name: 'validation_error', message: 'The domain is not verified' } }]);
    await expect(mailTransport.send([message('a@test.dev')])).resolves.toBeNull();
  });

  it('returns null when Resend is unreachable', async () => {
    Object.assign(process.env, { RESEND_API_KEY: 're_test_key', EMAIL_FROM: 'shop@test.dev', RESEND_API_BASE: 'http://127.0.0.1:9' });
    await expect(mailTransport.send([message('a@test.dev')])).resolves.toBeNull();
  });

  it('sends nothing without RESEND_API_KEY or EMAIL_FROM', async () => {
    const { received } = await useStub([{ status: 200, body: { id: 'em_1' } }]);
    process.env.RESEND_API_KEY = '';
    await expect(mailTransport.send([message('a@test.dev')])).resolves.toBeNull();
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = '';
    await expect(mailTransport.send([message('a@test.dev')])).resolves.toBeNull();
    expect(received).toHaveLength(0);
  });

  it('does nothing for an empty list', async () => {
    await expect(mailTransport.send([])).resolves.toEqual([]);
  });
});

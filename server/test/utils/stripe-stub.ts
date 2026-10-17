// Local stand-in for the parts of the Stripe API the shop uses (PaymentIntents, refunds, signed
// webhooks), so API and e2e tests run the real Stripe SDK without calling Stripe.
// Only erasable TypeScript syntax: Node runs this file directly from e2e/support/start-server.mjs.
import { createHmac } from 'node:crypto';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

type Json = Record<string, unknown>;

export interface StubPaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  amount_received: number;
  currency: string;
  status: string;
  client_secret: string;
  metadata: Record<string, string>;
  receipt_email: string | null;
  description: string | null;
  automatic_payment_methods: { enabled: boolean } | null;
  latest_charge: string | StubCharge | null;
  last_payment_error: { message: string; code: string } | null;
}

export interface StubCharge {
  id: string;
  object: 'charge';
  amount: number;
  amount_refunded: number;
  refunded: boolean;
  currency: string;
  payment_intent: string;
}

export interface StubRequest {
  method: string;
  path: string;
  idempotencyKey?: string;
  body: Json;
}

/** Parses Stripe's form encoding (`metadata[orderId]=1&expand[0]=latest_charge`) into an object */
export function parseStripeForm(raw: string): Json {
  const result: Json = {};
  for (const [key, value] of new URLSearchParams(raw)) {
    const parts = key.split('[').map((p) => p.replace(/]$/, ''));
    let node: Json = result;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        node[part] = value;
      } else {
        node[part] = (node[part] as Json) ?? {};
        node = node[part] as Json;
      }
    });
  }
  return result;
}

/** The `Stripe-Signature` header Stripe sends: t=<unix>,v1=HMAC-SHA256(secret, "<t>.<payload>") */
export function signWebhook(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

const asBool = (value: unknown) => value === true || value === 'true';

export class StripeStub {
  url = '';
  readonly requests: StubRequest[] = [];
  readonly intents = new Map<string, StubPaymentIntent>();
  readonly charges = new Map<string, StubCharge>();
  /** Where `confirm()` delivers signed webhooks (set by the test / e2e server) */
  webhook: { url: string; secret: string } | null = null;
  /** Makes the next API calls fail with this HTTP status (e.g. 500), once per entry */
  failNext: number[] = [];

  private server: Server | undefined;
  private counter = 0;
  private readonly idempotent = new Map<string, Json>();

  async start(): Promise<this> {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        void this.handle(req, res, Buffer.concat(chunks).toString());
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(0, '127.0.0.1', () => resolve()));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
    return this;
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
  }

  reset(): void {
    this.requests.length = 0;
    this.intents.clear();
    this.charges.clear();
    this.idempotent.clear();
    this.failNext = [];
    this.counter = 0;
  }

  apiCalls(method?: string, pathPrefix?: string): StubRequest[] {
    return this.requests.filter((r) => (!method || r.method === method) && (!pathPrefix || r.path.startsWith(pathPrefix)));
  }

  /** What the customer's bank does after Stripe.js confirmed: the payment succeeds (and a webhook is sent) */
  async confirm(intentId: string, outcome: 'succeeded' | 'declined' | 'processing' = 'succeeded'): Promise<StubPaymentIntent> {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error(`Unknown PaymentIntent ${intentId}`);
    if (outcome === 'declined') {
      intent.status = 'requires_payment_method';
      intent.last_payment_error = { code: 'card_declined', message: 'Your card was declined.' };
      await this.sendEvent('payment_intent.payment_failed', intent);
    } else if (outcome === 'processing') {
      intent.status = 'processing';
      await this.sendEvent('payment_intent.processing', intent);
    } else {
      const charge: StubCharge = {
        id: `ch_stub_${++this.counter}`,
        object: 'charge',
        amount: intent.amount,
        amount_refunded: 0,
        refunded: false,
        currency: intent.currency,
        payment_intent: intent.id,
      };
      this.charges.set(charge.id, charge);
      Object.assign(intent, { status: 'succeeded', amount_received: intent.amount, latest_charge: charge.id, last_payment_error: null });
      await this.sendEvent('payment_intent.succeeded', intent);
    }
    return intent;
  }

  /** Builds a Stripe event; sends it signed to `webhook` when configured. Returns the event and its raw body. */
  async sendEvent(
    type: string,
    object: object,
    options: { id?: string; deliver?: boolean } = {},
  ): Promise<{ event: Json; payload: string; response?: number }> {
    const event = {
      id: options.id ?? `evt_stub_${++this.counter}`,
      object: 'event',
      type,
      api_version: '2026-09-30.endive',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object: JSON.parse(JSON.stringify(object)) },
    };
    const payload = JSON.stringify(event);
    if (!this.webhook || options.deliver === false) return { event, payload };
    const response = await fetch(this.webhook.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signWebhook(payload, this.webhook.secret) },
      body: payload,
    });
    return { event, payload, response: response.status };
  }

  private send(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, {
      'content-type': 'application/json',
      // The fake Stripe.js in e2e calls the test endpoints from the browser
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
    });
    res.end(JSON.stringify(body));
  }

  private error(res: ServerResponse, status: number, message: string, type = 'invalid_request_error'): void {
    this.send(res, status, { error: { type, message } });
  }

  private async handle(req: IncomingMessage, res: ServerResponse, raw: string): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://stub');
    const path = url.pathname;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return this.send(res, 204, {});

    // Test helpers (not Stripe API)
    if (path === '/__requests') return this.send(res, 200, this.requests);
    const confirmMatch = /^\/__test\/confirm\/([^/]+)$/.exec(path);
    if (confirmMatch && method === 'POST') {
      const requested = (JSON.parse(raw || '{}') as { outcome?: string }).outcome;
      // 'redirect' (fake Stripe.js) pays like 'succeeded'; the browser then follows return_url
      const outcome = requested === 'declined' || requested === 'processing' ? requested : 'succeeded';
      try {
        return this.send(res, 200, await this.confirm(confirmMatch[1], outcome));
      } catch (error) {
        return this.error(res, 404, (error as Error).message);
      }
    }

    const body = (req.headers['content-type'] ?? '').includes('application/x-www-form-urlencoded') ? parseStripeForm(raw) : {};
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    this.requests.push({ method, path, idempotencyKey, body });

    const failure = this.failNext.shift();
    if (failure) return this.error(res, failure, 'Stub failure', 'api_error');

    if (idempotencyKey && method === 'POST' && this.idempotent.has(`${path}:${idempotencyKey}`)) {
      return this.send(res, 200, this.idempotent.get(`${path}:${idempotencyKey}`));
    }
    const remember = (result: Json) => {
      if (idempotencyKey && method === 'POST') this.idempotent.set(`${path}:${idempotencyKey}`, result);
      return this.send(res, 200, result);
    };

    if (method === 'POST' && path === '/v1/payment_intents') {
      const id = `pi_stub_${++this.counter}`;
      const intent: StubPaymentIntent = {
        id,
        object: 'payment_intent',
        amount: Number(body.amount),
        amount_received: 0,
        currency: String(body.currency),
        status: 'requires_payment_method',
        client_secret: `${id}_secret_stub`,
        metadata: (body.metadata as Record<string, string>) ?? {},
        receipt_email: (body.receipt_email as string) ?? null,
        description: (body.description as string) ?? null,
        automatic_payment_methods: body.automatic_payment_methods ? { enabled: asBool((body.automatic_payment_methods as Json).enabled) } : null,
        latest_charge: null,
        last_payment_error: null,
      };
      this.intents.set(id, intent);
      return remember({ ...intent });
    }

    const intentMatch = /^\/v1\/payment_intents\/([^/]+)$/.exec(path);
    if (intentMatch) {
      const intent = this.intents.get(intentMatch[1]);
      if (!intent) return this.error(res, 404, `No such payment_intent: '${intentMatch[1]}'`);
      if (method === 'POST') {
        if (['succeeded', 'processing', 'canceled'].includes(intent.status)) {
          return this.error(res, 400, `This PaymentIntent's amount could not be updated because it has a status of ${intent.status}.`);
        }
        if (body.amount !== undefined) intent.amount = Number(body.amount);
        if (body.currency !== undefined) intent.currency = String(body.currency);
        if (body.receipt_email !== undefined) intent.receipt_email = String(body.receipt_email);
        if (body.metadata) intent.metadata = { ...intent.metadata, ...(body.metadata as Record<string, string>) };
        return remember({ ...intent });
      }
      const expanded = Object.values((url.searchParams.size ? parseStripeForm(url.search.slice(1)).expand : {}) ?? {});
      const result: Json = { ...intent };
      if (expanded.includes('latest_charge') && typeof intent.latest_charge === 'string') {
        result.latest_charge = this.charges.get(intent.latest_charge) ?? null;
      }
      return this.send(res, 200, result);
    }

    if (method === 'POST' && path === '/v1/refunds') {
      const intent = this.intents.get(String(body.payment_intent));
      const charge = intent && typeof intent.latest_charge === 'string' ? this.charges.get(intent.latest_charge) : undefined;
      if (!intent || !charge) return this.error(res, 400, 'This PaymentIntent does not have a successful charge to refund.');
      const amount = body.amount !== undefined ? Number(body.amount) : charge.amount - charge.amount_refunded;
      if (amount <= 0 || charge.amount_refunded + amount > charge.amount) {
        return this.error(
          res,
          400,
          `Refund amount (${amount}) is greater than unrefunded amount on charge (${charge.amount - charge.amount_refunded}).`,
        );
      }
      charge.amount_refunded += amount;
      charge.refunded = charge.amount_refunded === charge.amount;
      const refund = {
        id: `re_stub_${++this.counter}`,
        object: 'refund',
        amount,
        currency: charge.currency,
        charge: charge.id,
        payment_intent: intent.id,
        status: 'succeeded',
        metadata: (body.metadata as Record<string, string>) ?? {},
      };
      return remember(refund);
    }

    return this.error(res, 404, `Unrecognized request URL (${method}: ${path}).`);
  }
}

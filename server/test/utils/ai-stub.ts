// Local stand-in for the Gemini API and Cloudinary image delivery, so AI tests exercise the real
// HTTP code paths without calling any external service.
import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';

export interface StubRequest {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  body: any;
}

export interface StubReply {
  status?: number;
  body: unknown;
  /** Delay before answering (to test timeouts) */
  delayMs?: number;
}

/** A Gemini generateContent reply whose text is `json` */
export const geminiReply = (json: unknown, usage = { promptTokenCount: 1200, candidatesTokenCount: 800, thoughtsTokenCount: 200 }): StubReply => ({
  body: {
    candidates: [{ content: { parts: [{ text: typeof json === 'string' ? json : JSON.stringify(json) }] }, finishReason: 'STOP' }],
    usageMetadata: usage,
  },
});

export class AiStub {
  readonly requests: StubRequest[] = [];
  /** Replies to provider calls, in order; the last one repeats */
  replies: StubReply[] = [];
  private server!: Server;
  url = '';

  async start(): Promise<this> {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        this.requests.push({ method: req.method!, url: req.url!, headers: req.headers, body: raw ? JSON.parse(raw) : undefined });

        // Cloudinary delivery: /<cloud>/image/upload/<transformation>/<file>
        if (req.method === 'GET' && req.url!.includes('/image/upload/')) {
          const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
          res.writeHead(200, { 'content-type': 'image/png', 'content-length': png.length });
          res.end(png);
          return;
        }

        const providerCalls = this.requests.filter((r) => r.method === 'POST').length;
        const reply = this.replies[Math.min(providerCalls, this.replies.length) - 1] ?? { status: 500, body: { error: 'no reply set' } };
        setTimeout(() => {
          res.writeHead(reply.status ?? 200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(reply.body));
        }, reply.delayMs ?? 0);
      });
    });
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
    return this;
  }

  providerCalls(): StubRequest[] {
    return this.requests.filter((r) => r.method === 'POST');
  }

  reset(): void {
    this.requests.length = 0;
    this.replies = [];
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

/** A valid model answer for en/sk/cs */
export const draftAnswer = (overrides: Record<string, unknown> = {}) => {
  const lang = (name: string) => ({
    title: `${name} winter jacket`,
    shortDescription: `Warm ${name} down jacket.`,
    descriptionHtml: `<p>Warm jacket for cold days.</p><script>alert(1)</script><h1 onclick="x()">Big</h1>`,
    attributes: [
      { name: 'Colour', value: 'black' },
      { name: 'Sizes', value: 'L–XXL' },
    ],
    seoTitle: `${name} winter jacket | Shop`,
    metaDescription: `Black down jacket in sizes L to XXL.`,
  });
  return {
    titleUrl: 'Men’s Winter Jacket',
    categories: ['jackets'],
    suggestedCategories: ['Winter wear'],
    warnings: ['Fill weight is not given.'],
    translations: { en: lang('EN'), sk: lang('SK'), cs: lang('CS') },
    ...overrides,
  };
};

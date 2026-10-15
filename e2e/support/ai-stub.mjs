// Local stand-in for Cloudinary (upload API + image delivery) and the Gemini API, so the e2e
// server can run the AI product flow without any external service.
//   POST /v1_1/<cloud>/<type>/upload          Cloudinary upload (CLOUDINARY_URL upload_prefix)
//   GET  /<cloud>/image/upload/...            image delivery (AI_IMAGE_ORIGIN)
//   POST /v1beta/models/<model>:generateContent  Gemini (AI_BASE_URL)
//   GET  /__requests                          what the stub received (for assertions)
import { createServer } from 'node:http';

import { E2E } from './fixtures.mjs';

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

/** The model's answer for every language of the shop */
const draftAnswer = (call) => ({
  titleUrl: E2E.ai.titleUrl,
  categories: [E2E.ai.category],
  // Unique per call: once saved, a category exists and is (correctly) no longer suggested
  suggestedCategories: [`${E2E.ai.suggestedCategory} ${call}`],
  warnings: [E2E.ai.warning],
  translations: Object.fromEntries(
    Object.entries(E2E.ai.titles).map(([lang, title]) => [
      lang,
      {
        title,
        shortDescription: `${title}: warm and light.`,
        descriptionHtml: `<p>${title} for cold days.</p>`,
        attributes: [{ name: 'Colour', value: 'black' }],
        seoTitle: `${title} | E2E shop`,
        metaDescription: `${title} in sizes L to XXL.`,
      },
    ]),
  ),
});

export async function startAiStub({ cloudName }) {
  const requests = [];
  let uploads = 0;
  let aiCalls = 0;
  let url = '';

  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      const json = (req.headers['content-type'] ?? '').includes('application/json') && raw.length ? JSON.parse(raw.toString()) : undefined;
      const send = (status, body, type = 'application/json') => {
        const payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
        res.writeHead(status, { 'content-type': type, 'content-length': payload.length });
        res.end(payload);
      };

      if (req.url === '/__requests') return send(200, requests);
      requests.push({ method: req.method, url: req.url, headers: { 'x-goog-api-key': req.headers['x-goog-api-key'] }, body: json });

      if (req.method === 'POST' && req.url.startsWith(`/v1_1/${cloudName}/`)) {
        uploads += 1;
        const publicId = `products/e2e-upload-${uploads}`;
        return send(200, { public_id: publicId, secure_url: `${url}/${cloudName}/image/upload/v1/${publicId}.png`, format: 'png' });
      }
      if (req.method === 'GET' && req.url.startsWith(`/${cloudName}/image/upload/`)) {
        return send(200, PNG, 'image/png');
      }
      if (req.method === 'POST' && req.url.includes(':generateContent')) {
        const prompt = JSON.stringify(json?.contents ?? '');
        if (prompt.includes(E2E.ai.failWord)) return send(500, { error: { message: 'stub failure' } });
        aiCalls += 1;
        return send(200, {
          candidates: [{ content: { parts: [{ text: JSON.stringify(draftAnswer(aiCalls)) }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 900, thoughtsTokenCount: 100 },
        });
      }
      send(404, { error: 'not stubbed' });
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    stop: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

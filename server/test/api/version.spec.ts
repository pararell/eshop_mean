import { createTestApp, TestApp } from '../utils/test-app';

describe('GET /api/version', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('answers the build info only, without login', async () => {
    const res = await t.http.get('/api/version').expect(200);
    // Not built with scripts/build-ssr.mjs here, so every field falls back to "dev"
    expect(res.body).toEqual({ version: 'dev', sha: 'dev', buildDate: 'dev' });
  });
});

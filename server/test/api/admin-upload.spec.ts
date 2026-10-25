import { adminToken, createTestApp, TestApp } from '../utils/test-app';

describe('POST /api/admin/images/upload limits', () => {
  let t: TestApp;
  let auth: { Authorization: string };

  beforeAll(async () => {
    t = await createTestApp();
    auth = { Authorization: `Bearer ${await adminToken(t)}` };
  });
  afterAll(() => t.close());

  it('accepts only images (415 otherwise)', async () => {
    const res = await t.http
      .post('/api/admin/images/upload')
      .set(auth)
      .attach('file', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(415);
    expect(res.body.message).toMatch(/JPEG, PNG, WebP or GIF/);
  });

  it('rejects files over 10 MB (413) before they reach Cloudinary', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1);
    await t.http.post('/api/admin/images/upload').set(auth).attach('file', big, { filename: 'big.jpg', contentType: 'image/jpeg' }).expect(413);
  });

  it('accepts one file only', async () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff]);
    await t.http
      .post('/api/admin/images/upload')
      .set(auth)
      .attach('file', jpg, { filename: 'a.jpg', contentType: 'image/jpeg' })
      .attach('file', jpg, { filename: 'b.jpg', contentType: 'image/jpeg' })
      .expect(400);
  });
});

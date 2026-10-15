import { fetchImage, ImageInputError, resizedImageUrl } from './ai-images';

describe('resizedImageUrl', () => {
  const options = { imageOrigin: 'https://res.cloudinary.com', cloudName: 'shop' };

  it('adds the resize transformation to this shop’s Cloudinary images', () => {
    expect(resizedImageUrl('https://res.cloudinary.com/shop/image/upload/v17/products/jacket.jpg', options)).toBe(
      'https://res.cloudinary.com/shop/image/upload/c_limit,w_1024,h_1024,f_jpg,q_80/v17/products/jacket.jpg',
    );
  });

  it.each([
    ['another host', 'https://evil.example/shop/image/upload/a.jpg'],
    ['another Cloudinary account', 'https://res.cloudinary.com/other/image/upload/a.jpg'],
    ['a non-image resource', 'https://res.cloudinary.com/shop/raw/upload/a.jpg'],
    ['a query string', 'https://res.cloudinary.com/shop/image/upload/a.jpg?x=1'],
    ['plain http', 'http://res.cloudinary.com/shop/image/upload/a.jpg'],
    ['no URL at all', 'not a url'],
  ])('rejects %s', (_case, url) => {
    expect(() => resizedImageUrl(url, options)).toThrow(ImageInputError);
  });
});

describe('fetchImage', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  const respond = (body: Buffer, headers: Record<string, string>, status = 200) => {
    global.fetch = jest.fn().mockResolvedValue(new Response(new Uint8Array(body), { status, headers }));
  };

  it('returns base64 data and the MIME type', async () => {
    respond(Buffer.from('abc'), { 'content-type': 'image/jpeg' });
    await expect(fetchImage('https://x/a.jpg', 1000)).resolves.toEqual({ mimeType: 'image/jpeg', data: 'YWJj' });
    expect(global.fetch).toHaveBeenCalledWith('https://x/a.jpg', expect.objectContaining({ redirect: 'error' }));
  });

  it('rejects non-images, oversized images and HTTP errors', async () => {
    respond(Buffer.from('<html>'), { 'content-type': 'text/html' });
    await expect(fetchImage('https://x/a', 1000)).rejects.toThrow(/not a supported image/);

    respond(Buffer.alloc(10), { 'content-type': 'image/png', 'content-length': '5000000' });
    await expect(fetchImage('https://x/a', 1000)).rejects.toThrow(/larger than/);

    respond(Buffer.alloc(2000), { 'content-type': 'image/png' });
    await expect(fetchImage('https://x/a', 1000)).rejects.toThrow(/larger than/);

    respond(Buffer.alloc(0), { 'content-type': 'image/png' }, 404);
    await expect(fetchImage('https://x/a', 1000)).rejects.toThrow(/HTTP 404/);
  });

  it('turns network failures into a clear error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(fetchImage('https://x/a', 1000)).rejects.toThrow(ImageInputError);
  });
});

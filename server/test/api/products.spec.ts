import { adminToken, createTestApp, eventually, productFixture, TestApp } from '../utils/test-app';

describe('Products API', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  beforeEach(async () => {
    await t.model('Product').deleteMany({});
    await t.model('Category').deleteMany({});
  });

  const list = (query: Record<string, string>) =>
    t.http
      .get('/api/products')
      .set('lang', 'en')
      .query({ lang: 'en', page: '1', sort: 'newest', ...query });

  describe('GET /api/products', () => {
    it('returns visible products in the requested language with pagination', async () => {
      await t
        .model('Product')
        .create([productFixture('visible-car'), productFixture('hidden-car', { en: { ...productFixture('x').en, visibility: false } })]);

      const res = await list({}).expect(200);

      expect(res.body.all.map((p: any) => p.titleUrl)).toEqual(['visible-car']);
      expect(res.body.all[0]).toMatchObject({ title: 'Title visible-car', salePrice: 25 });
      expect(res.body.all[0].descriptionFull).toEqual([]); // list is "light"
      expect(res.body.pagination).toEqual({ total: 1, limit: 12, page: 1, pages: 1 });
    });

    it('paginates by 12 per page', async () => {
      await t.model('Product').create(Array.from({ length: 14 }, (_, i) => productFixture(`car-${i}`)));

      const page1 = await list({ page: '1' }).expect(200);
      const page2 = await list({ page: '2' }).expect(200);

      expect(page1.body.all).toHaveLength(12);
      expect(page2.body.all).toHaveLength(2);
      expect(page2.body.pagination).toMatchObject({ total: 14, page: 2, pages: 2 });
    });

    it('sorts by price and by date', async () => {
      const withPrice = (titleUrl: string, salePrice: number, dateAdded: string) =>
        productFixture(titleUrl, {
          dateAdded: new Date(dateAdded),
          en: { ...productFixture(titleUrl).en, salePrice },
        });
      await t
        .model('Product')
        .create([withPrice('mid', 20, '2026-02-01'), withPrice('cheap', 10, '2026-03-01'), withPrice('pricey', 30, '2026-01-01')]);

      const titles = async (sort: string) => (await list({ sort }).expect(200)).body.all.map((p: any) => p.titleUrl);

      expect(await titles('priceasc')).toEqual(['cheap', 'mid', 'pricey']);
      expect(await titles('pricedesc')).toEqual(['pricey', 'mid', 'cheap']);
      expect(await titles('newest')).toEqual(['cheap', 'mid', 'pricey']);
      expect(await titles('oldest')).toEqual(['pricey', 'mid', 'cheap']);
    });

    it('filters by category and max price', async () => {
      await t
        .model('Product')
        .create([
          productFixture('car', { tags: ['cars'] }),
          productFixture('bike', { tags: ['bikes'], en: { ...productFixture('b').en, salePrice: 100 } }),
        ]);

      const byCategory = await list({ category: 'bikes' }).expect(200);
      expect(byCategory.body.all.map((p: any) => p.titleUrl)).toEqual(['bike']);

      const byPrice = await list({ maxPrice: '50' }).expect(200);
      expect(byPrice.body.all.map((p: any) => p.titleUrl)).toEqual(['car']);
    });

    it('rejects an unknown sort option', async () => {
      await list({ sort: 'random' }).expect(400);
    });
  });

  describe('GET /api/products/:name', () => {
    it('returns the localized product', async () => {
      await t.model('Product').create(productFixture('car'));

      const res = await t.http.get('/api/products/car').query({ lang: 'en' }).expect(200);

      expect(res.body).toMatchObject({
        titleUrl: 'car',
        title: 'Title car',
        salePrice: 25,
        descriptionFull: ['<p>Full description</p>'],
      });
    });

    it('returns every language of the raw product, empty ones included (dashboard edit form)', async () => {
      await t.model('Product').create(productFixture('car'));

      const res = await t.http.get('/api/products/car').expect(200);

      expect(res.body.en.title).toBe('Title car');
      expect(res.body.sk).toEqual({ descriptionFull: [] });
      expect(res.body.cs).toEqual({ descriptionFull: [] });
    });

    it('returns 404 for an unknown product', async () => {
      await t.http.get('/api/products/nope').query({ lang: 'en' }).expect(404);
    });
  });

  describe('GET /api/products/categories', () => {
    it('returns visible categories ordered by position', async () => {
      await t.model('Category').create([
        { titleUrl: 'b', en: { title: 'B', position: 2, visibility: true } },
        { titleUrl: 'a', en: { title: 'A', position: 1, visibility: true } },
        { titleUrl: 'hidden', en: { title: 'H', position: 0, visibility: false } },
      ]);

      const res = await t.http.get('/api/products/categories').set('lang', 'en').expect(200);

      expect(res.body.map((c: any) => [c.titleUrl, c.title])).toEqual([
        ['a', 'A'],
        ['b', 'B'],
      ]);
    });
  });

  describe('admin product management', () => {
    it('creates a product and its categories', async () => {
      const token = await adminToken(t);

      await t.http
        .post('/api/products/add')
        .set('Authorization', `Bearer ${token}`)
        .send(productFixture('new-car', { tags: ['Sports Cars'] }))
        .expect(201);

      const saved = await eventually(async () => {
        const doc = await t.model('Product').findOne({ titleUrl: 'new-car' }).lean();
        if (!doc) throw new Error('not saved yet');
        return doc as any;
      });
      expect(saved.en.title).toBe('Title new-car');

      const category = await eventually(async () => {
        const doc = await t.model('Category').findOne({ titleUrl: 'sports_cars' }).lean();
        if (!doc) throw new Error('category not saved yet');
        return doc as any;
      });
      expect(category.en.title).toBe('Sports Cars');
    });

    it('stores the SEO title and meta description per language', async () => {
      const token = await adminToken(t);
      const en = { ...productFixture('seo-car').en, seoTitle: 'SEO car | Shop', metaDescription: 'Fast red car.' };

      await t.http.post('/api/products/add').set('Authorization', `Bearer ${token}`).send(productFixture('seo-car', { en })).expect(201);

      const res = await t.http.get('/api/products/seo-car').query({ lang: 'en' }).expect(200);
      expect(res.body).toMatchObject({ seoTitle: 'SEO car | Shop', metaDescription: 'Fast red car.' });
    });

    it('rejects a duplicate titleUrl', async () => {
      const token = await adminToken(t);
      await t.model('Product').create(productFixture('car'));

      await t.http.post('/api/products/add').set('Authorization', `Bearer ${token}`).send(productFixture('car')).expect(400);
    });

    it('edits an existing product', async () => {
      const token = await adminToken(t);
      await t.model('Product').create(productFixture('car'));

      await t.http
        .patch('/api/products/edit')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...productFixture('car'), en: { ...productFixture('car').en, salePrice: 99 } })
        .expect(200);

      const doc: any = await t.model('Product').findOne({ titleUrl: 'car' }).lean();
      expect(doc.en.salePrice).toBe(99);
    });

    it('deletes a product', async () => {
      const token = await adminToken(t);
      await t.model('Product').create(productFixture('car'));

      await t.http.delete('/api/products/car').set('Authorization', `Bearer ${token}`).expect(200);

      expect(await t.model('Product').countDocuments({ titleUrl: 'car' })).toBe(0);
    });
  });
});

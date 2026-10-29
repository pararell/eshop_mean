// The client has no unit-test runner; pure client functions are tested here with the server's Jest
import type { ListingStyles, ListingTile } from '@eshop/shared';

import { listingFeatured, listingGrid, listingHeader, listingTiles, TileView } from '../../../client/src/app/shared/listing';

const tile = (id: string, extra: Partial<ListingTile> = {}): ListingTile => ({
  id,
  image: `https://img/${id}.jpg`,
  link: '/en/product/category/tents',
  pages: [],
  text: { en: { title: `Tile ${id}` } },
  ...extra,
});
const products = (count: number) => Array.from({ length: count }, (_, i) => ({ _id: `p${i + 1}` }));
/** The grid as short labels: p1, p2, [a], … (★ = featured) */
const labels = (items: ReturnType<typeof listingGrid<{ _id: string }>>) =>
  items.map((item) => (item.kind === 'tile' ? `[${item.tile.id}]` : item.kind === 'featured' ? `★${item.product._id}` : item.product._id));

describe('listing pages', () => {
  describe('header', () => {
    const listing: ListingStyles = { header: { image: 'https://img/all.jpg', text: { en: { title: 'All gear', text: ' For every trail ' } } } };

    it('uses the listing header on All products, with the fallback title when it has none in the language', () => {
      expect(listingHeader(listing, undefined, 'en', 'Products')).toEqual({
        title: 'All gear',
        text: 'For every trail',
        image: 'https://img/all.jpg',
      });
      expect(listingHeader(listing, undefined, 'sk', 'Produkty')).toEqual({ title: 'Produkty', text: '', image: 'https://img/all.jpg' });
      expect(listingHeader(undefined, undefined, 'en', 'Products')).toEqual({ title: 'Products', text: '', image: '' });
    });

    it("uses a category's header image, else its main image", () => {
      const category = { title: 'Tents', description: 'Sleep out', mainImage: { url: 'https://img/main.jpg' } };
      expect(listingHeader(listing, category, 'en', 'Products')).toEqual({ title: 'Tents', text: 'Sleep out', image: 'https://img/main.jpg' });
      expect(listingHeader(listing, { ...category, headerImage: 'https://img/wide.jpg' }, 'en', 'x').image).toBe('https://img/wide.jpg');
      expect(listingHeader(listing, { title: 'Tents' }, 'en', 'x')).toEqual({ title: 'Tents', text: '', image: '' });
    });
  });

  it('lists the tiles of a page that have a title and an image in the language', () => {
    const listing: ListingStyles = {
      tiles: [
        tile('a'),
        tile('b', { pages: ['*'] }),
        tile('c', { pages: ['tents'], link: 'https://blog.example/hike' }),
        tile('d', { text: { sk: { title: 'Len SK' } } }),
        tile('e', { image: '' }),
      ],
    };
    expect(listingTiles(listing, '*', 'en').map((t) => t.id)).toEqual(['a', 'b']);
    const tents = listingTiles(listing, 'tents', 'en');
    expect(tents.map((t) => t.id)).toEqual(['a', 'c']);
    expect(tents[1]).toMatchObject({ internal: false, button: '', text: '' });
    expect(tents[0].internal).toBe(true);
  });

  it('finds the featured setting of a page; a product source needs a product', () => {
    const listing: ListingStyles = {
      featured: [
        { page: '*', source: 'sale' },
        { page: 'tents', source: 'product', product: '' },
      ],
    };
    expect(listingFeatured(listing, '*')).toEqual({ page: '*', source: 'sale' });
    expect(listingFeatured(listing, 'tents')).toBeUndefined();
    expect(listingFeatured(listing, 'cars')).toBeUndefined();
  });

  describe('grid', () => {
    const tiles = ['a', 'b', 'c'].map((id) => ({ id }) as TileView);

    it('puts a tile after every N products, each tile once per page', () => {
      const grid = listingGrid(products(7), { tiles, every: 2, page: 1, perPage: 12 });
      expect(labels(grid)).toEqual(['p1', 'p2', '[a]', 'p3', 'p4', '[b]', 'p5', 'p6', '[c]', 'p7']);
      expect(labels(listingGrid(products(9), { tiles: tiles.slice(0, 1), every: 2, page: 1, perPage: 12 }))).toEqual([
        'p1',
        'p2',
        '[a]',
        'p3',
        'p4',
        'p5',
        'p6',
        'p7',
        'p8',
        'p9',
      ]);
    });

    it('starts the next page further along the tiles', () => {
      // 12 per page, a tile after every 6: two slots per page, so page 2 starts at the third tile
      expect(labels(listingGrid(products(12), { tiles, every: 6, page: 2, perPage: 12 })).filter((l) => l.startsWith('['))).toEqual(['[c]', '[a]']);
    });

    it('shows the featured product first and not again among the others', () => {
      const all = products(4);
      expect(labels(listingGrid(all, { featured: all[2], tiles, every: 2, page: 1, perPage: 12 }))).toEqual(['★p3', 'p1', 'p2', '[a]', 'p4']);
      expect(labels(listingGrid(all, { featured: { _id: 'x' }, tiles: [], page: 1, perPage: 12 }))).toEqual(['★x', 'p1', 'p2', 'p3', 'p4']);
    });

    it('uses the default interval, and never fewer than 2 products between tiles', () => {
      expect(labels(listingGrid(products(7), { tiles, page: 1, perPage: 12 }))).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', '[a]', 'p7']);
      expect(labels(listingGrid(products(3), { tiles, every: 0.4, page: 1, perPage: 12 }))).toEqual(['p1', 'p2', '[a]', 'p3']);
    });
  });
});

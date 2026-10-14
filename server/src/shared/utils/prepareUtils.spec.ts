import { prepareCart, prepareProduct } from './prepareUtils';

const product = (
  id: string,
  en: Partial<{ salePrice: number; visibility: boolean; shipping: string }> = {},
) => ({
  _id: id,
  titleUrl: id,
  tags: ['cars'],
  images: [],
  mainImage: { url: 'u', name: 'n' },
  en: {
    title: `Title ${id}`,
    description: 'd',
    descriptionFull: ['<p>full</p>'],
    salePrice: 10,
    regularPrice: 12,
    visibility: true,
    shipping: 'basic',
    ...en,
  },
});

const cartOf = (...lines: [ReturnType<typeof product>, number][]) => ({
  items: lines.map(([item, qty]) => ({ item, id: item._id, qty })),
});

const config = {
  en: {
    shippingCost: {
      basic: { cost: 4, limit: 50 },
      extended: { cost: 9, limit: 150 },
    },
  },
};

describe('prepareProduct', () => {
  it('flattens the language sub-document onto the product', () => {
    const result = prepareProduct(product('a'), 'en');
    expect(result).toMatchObject({
      _id: 'a',
      titleUrl: 'a',
      title: 'Title a',
      salePrice: 10,
      descriptionFull: ['<p>full</p>'],
    });
  });

  it('omits the full description in light mode', () => {
    expect(prepareProduct(product('a'), 'en', true).descriptionFull).toEqual([]);
  });
});

describe('prepareCart', () => {
  it('returns an empty cart without shipping', () => {
    expect(prepareCart({ items: [] }, 'en', config)).toEqual({
      items: [],
      shippingCost: 0,
      shippingLimit: 50,
      shippingType: '',
      totalPrice: 0,
      totalQty: 0,
    });
  });

  it('sums sale price × quantity and adds basic shipping from the config', () => {
    const cart = prepareCart(cartOf([product('a'), 2], [product('b', { salePrice: 5 }), 1]), 'en', config);
    expect(cart.totalQty).toBe(3);
    expect(cart.shippingType).toBe('basic');
    expect(cart.shippingCost).toBe(4);
    expect(cart.totalPrice).toBe(2 * 10 + 5 + 4); // total includes shipping
    expect(cart.items.map((i: any) => i.price)).toEqual([10, 5]);
  });

  it('uses extended shipping when any item requires it', () => {
    const cart = prepareCart(
      cartOf([product('a'), 1], [product('b', { shipping: 'extended' }), 1]),
      'en',
      config,
    );
    expect(cart.shippingType).toBe('extended');
    expect(cart.shippingCost).toBe(9);
    expect(cart.totalPrice).toBe(20 + 9);
  });

  it('makes shipping free when the subtotal reaches the limit', () => {
    const cart = prepareCart(cartOf([product('a'), 5]), 'en', config); // 50 = basic limit
    expect(cart.shippingCost).toBe(0);
    expect(cart.shippingType).toBe('free');
    expect(cart.totalPrice).toBe(50);
  });

  it('charges shipping just below the limit', () => {
    const cart = prepareCart(cartOf([product('a', { salePrice: 49.99 }), 1]), 'en', config);
    expect(cart.shippingCost).toBe(4);
    expect(cart.totalPrice).toBeCloseTo(53.99);
  });

  it('falls back to the built-in shipping table when there is no config', () => {
    // shared/constans.ts: en basic = 5 below 100
    const cart = prepareCart(cartOf([product('a'), 1]), 'en', undefined);
    expect(cart.shippingCost).toBe(5);
    expect(cart.shippingLimit).toBe(100);
    expect(cart.totalPrice).toBe(15);
  });

  it('excludes hidden products and products without a price', () => {
    const cart = prepareCart(
      cartOf(
        [product('a'), 1],
        [product('hidden', { visibility: false }), 3],
        [product('free', { salePrice: 0 }), 2],
      ),
      'en',
      config,
    );
    expect(cart.items.map((i: any) => i.id)).toEqual(['a']);
    expect(cart.totalQty).toBe(1);
    expect(cart.totalPrice).toBe(10 + 4);
  });
});

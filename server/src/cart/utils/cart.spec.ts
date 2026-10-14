import { Cart } from './cart';

const product = (id: string) => ({ _id: id, titleUrl: id }) as any;

describe('Cart', () => {
  it('starts empty when there is no previous cart', () => {
    expect(new Cart({} as any).items).toEqual([]);
  });

  it('keeps items from the previous cart', () => {
    const previous = { items: [{ id: 'a', qty: 2, item: product('a') }] } as any;
    expect(new Cart(previous).items).toHaveLength(1);
  });

  it('adds a new product with quantity 1', () => {
    const cart = new Cart({ items: [] } as any);
    cart.add(product('a'), 'a');
    expect(cart.items).toEqual([{ item: product('a'), id: 'a', qty: 1 }]);
  });

  it('increments quantity when the same product is added again', () => {
    const cart = new Cart({ items: [] } as any);
    cart.add(product('a'), 'a');
    cart.add(product('a'), 'a');
    cart.add(product('b'), 'b');
    expect(cart.items.map((i: any) => [i.id, i.qty])).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });

  it('decrements quantity on remove', () => {
    const cart = new Cart({ items: [] } as any);
    cart.add(product('a'), 'a');
    cart.add(product('a'), 'a');
    cart.remove('a');
    expect(cart.items.map((i: any) => [i.id, i.qty])).toEqual([['a', 1]]);
  });

  it('drops the item when the last unit is removed', () => {
    const cart = new Cart({ items: [] } as any);
    cart.add(product('a'), 'a');
    cart.add(product('b'), 'b');
    cart.remove('a');
    expect(cart.items.map((i: any) => i.id)).toEqual(['b']);
  });

  it('ignores removing a product that is not in the cart', () => {
    const cart = new Cart({ items: [] } as any);
    cart.add(product('a'), 'a');
    cart.remove('missing');
    expect(cart.items.map((i: any) => [i.id, i.qty])).toEqual([['a', 1]]);
  });

  it('check() finds an item by id', () => {
    const cart = new Cart({ items: [] } as any);
    cart.add(product('a'), 'a');
    expect(cart.check('a')).toMatchObject({ id: 'a', qty: 1 });
    expect(cart.check('missing')).toBeUndefined();
  });
});

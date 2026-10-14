import type { ProductRaw, SessionCart, SessionCartItem } from '@eshop/shared';

/** Session cart. Methods are function properties (not class methods) so they survive as before. */
export class Cart implements SessionCart {
  items: SessionCartItem[];

  constructor(previousCart: Partial<SessionCart>) {
    this.items = previousCart.items || [];
  }

  add = function (this: Cart, item: ProductRaw, id: string): void {
    const itemExist = !!this.items.filter((cartItem) => cartItem.id === id).length;

    if (!itemExist) {
      this.items.push({ item, id, qty: 1 });
    } else {
      this.items.forEach((cartItem) => {
        if (cartItem.id === id) {
          cartItem.qty++;
        }
      });
    }
  };

  remove = function (this: Cart, id: string): void {
    this.items = this.items
      .map((cartItem: SessionCartItem | Partial<SessionCartItem>) => {
        if (cartItem.id === id && cartItem.qty! > 1) {
          cartItem.qty!--;
        } else if (cartItem.id === id && cartItem.qty === 1) {
          cartItem = {};
        }

        return cartItem;
      })
      .filter((cartItem): cartItem is SessionCartItem => !!cartItem.id);
  };

  check = function (this: Cart, id: string): SessionCartItem | undefined {
    return this.items.find((cartItem) => cartItem.id === id);
  };
}

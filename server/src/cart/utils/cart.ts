import { Product } from '../../entities/product.entity';

export class Cart {
  items: any[];

  constructor(previousCart: { items: any[] }) {
    this.items = previousCart.items || [];
  }

  add = function (item: Product, id: string): void {
    const itemExist = !!this.items.filter((cartItem) => cartItem.id === id)
      .length;

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

  remove = function (id: string): void {
    this.items = this.items
      .map((cartItem) => {
        if (cartItem.id === id && cartItem.qty > 1) {
          cartItem.qty--;
        } else if (cartItem.id === id && cartItem.qty === 1) {
          cartItem = {};
        }
        return cartItem;
      })
      .filter((cartItem) => cartItem.id);
  };

  check = function (id: string): any {
    return this.items.find((cartItem) => cartItem.id === id);
  };
}
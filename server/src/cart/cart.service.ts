import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ProductRaw } from '@eshop/shared';

import { Cart } from './utils/cart';
import { GetCartChangeDto } from './dto/cart-change.dto';
import { ProductModel } from '../products/models/product.model';
import { CartModel } from './models/cart.model';
import { prepareCart } from '../shared/utils/prepareUtils';
import { ShopSession } from '../shared/types/session';

export interface CartChange {
  newCart: Cart;
  langCart: CartModel | Cart;
}

@Injectable()
export class CartService {
  constructor(@InjectModel('Product') private productModel: ProductModel) {}

  async getCart(session: ShopSession, lang: string): Promise<CartModel> {
    const { cart, config } = session;
    const savedCart = cart || new Cart({ items: [] });

    return prepareCart(savedCart, lang, config);
  }

  async addToCart(session: ShopSession, getCartChangeDto: GetCartChangeDto, lang: string): Promise<CartChange> {
    const { cart, config } = session;
    const { id } = getCartChangeDto;
    const newCart: Cart = new Cart(cart || {});

    try {
      const product = await this.productModel.findById(id);
      // Known bug (audit BUG-25): a missing product is added as `null` and fails in prepareCart
      newCart.add(product as unknown as ProductRaw, id);
      return { newCart, langCart: prepareCart(newCart, lang, config) };
    } catch {
      return { newCart, langCart: prepareCart(newCart, lang, config) };
    }
  }

  async removeFromCart(session: ShopSession, getCartChangeDto: GetCartChangeDto, lang: string): Promise<CartChange> {
    const { cart, config } = session;
    const { id } = getCartChangeDto;
    const newCart = new Cart(cart || { items: [] });

    try {
      const product = await this.productModel.findById(id);
      if (!product) {
        const itIsInCart = newCart.check(id);
        if (itIsInCart) {
          const emptyCart = new Cart({ items: [] });
          return { newCart: emptyCart, langCart: emptyCart };
        }
      }
      newCart.remove(id);
      return { newCart, langCart: prepareCart(newCart, lang, config) };
    } catch {
      return { newCart, langCart: prepareCart(newCart, lang, config) };
    }
  }
}

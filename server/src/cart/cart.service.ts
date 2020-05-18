import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Cart } from './utils/cart';
import { GetCartChangeDto } from './dto/cart-change.dto';
import { ProductModel } from '../products/models/product.model';
import { CartModel } from './models/cart.model';
import { prepareCart } from '../shared/utils/prepareUtils';

@Injectable()
export class CartService {
  constructor(@InjectModel('Product') private productModel: ProductModel) {}

  async getCart(cart: Cart, lang: string): Promise<CartModel> {
    const savedCart = cart || new Cart({});
    return prepareCart(savedCart, lang);
  }

  async addToCart(
    cart: Cart,
    getCartChangeDto: GetCartChangeDto,
    lang: string,
  ): Promise<{ newCart; langCart }> {
    const { id } = getCartChangeDto;
    const newCart: any = new Cart(cart || {});
    try {
      const product = await this.productModel.findById(id);
      newCart.add(product, id);
      return { newCart, langCart: prepareCart(newCart, lang) };
    } catch {
      return { newCart, langCart: prepareCart(newCart, lang) };
    }
  }

  async removeFromCart(
    cart: CartModel,
    getCartChangeDto: GetCartChangeDto,
    lang: string,
  ): Promise<{ newCart; langCart }> {
    const { id } = getCartChangeDto;
    const newCart = new Cart(cart || {});
    try {
      const product = await this.productModel.findById(id);

      if (!product) {
        const itIsInCart = newCart.check(id);

        if (itIsInCart) {
          const emptyCart = new Cart({});
          return { newCart: emptyCart, langCart: emptyCart };
        }
      }
      newCart.remove(id);
      return { newCart, langCart: prepareCart(newCart, lang) };
    } catch {
      return { newCart, langCart: prepareCart(newCart, lang) };
    }
  }
}

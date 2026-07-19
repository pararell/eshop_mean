import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cart } from './utils/cart';
import { GetCartChangeDto } from './dto/cart-change.dto';
import { Product } from '../entities/product.entity';
import { CartModel } from './models/cart.model';
import { prepareCart } from '../shared/utils/prepareUtils';

@Injectable()
export class CartService {
  constructor(@InjectRepository(Product) private productRepository: Repository<Product>) {}

  async getCart(session, lang: string): Promise<CartModel> {
    const { cart, config } = session;
    const savedCart = cart || new Cart({ items: [] });
    return prepareCart(savedCart, lang, config);
  }

  async addToCart(
    session,
    getCartChangeDto: GetCartChangeDto,
    lang: string,
  ): Promise<{ newCart; langCart }> {
    const { cart, config } = session;
    const { id } = getCartChangeDto;
    const newCart: Cart = new Cart(cart || {});
    try {
      const product = await this.productRepository.findOne({ where: { _id: id } });
      newCart.add(product, id);
      return { newCart, langCart: prepareCart(newCart, lang, config) };
    } catch {
      return { newCart, langCart: prepareCart(newCart, lang, config) };
    }
  }

  async removeFromCart(
    session,
    getCartChangeDto: GetCartChangeDto,
    lang: string,
  ): Promise<{ newCart; langCart }> {
    const { cart, config } = session;
    const { id } = getCartChangeDto;
    const newCart = new Cart(cart || { items: [] });
    try {
      const product = await this.productRepository.findOne({ where: { _id: id } });

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
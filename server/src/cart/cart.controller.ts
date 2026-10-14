import { Controller, Get, Query, ValidationPipe, Session, Headers } from '@nestjs/common';

import { CartService } from './cart.service';
import { GetCartChangeDto } from './dto/cart-change.dto';
import { CartModel } from './models/cart.model';
import { Cart } from './utils/cart';
import { ShopSession } from '../shared/types/session';

@Controller('api/cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@Session() session: ShopSession, @Headers('lang') lang: string): Promise<CartModel> {
    return this.cartService.getCart(session, lang);
  }

  @Get('/add')
  async addToCart(
    @Session() session: ShopSession,
    @Query(ValidationPipe) getCartChangeDto: GetCartChangeDto,
    @Headers('lang') lang: string,
  ): Promise<CartModel | Cart> {
    const { newCart, langCart } = await this.cartService.addToCart(session, getCartChangeDto, lang);
    session.cart = newCart;
    return langCart;
  }

  @Get('/remove')
  async removeFromCart(
    @Session() session: ShopSession,
    @Query(ValidationPipe) getCartChangeDto: GetCartChangeDto,
    @Headers('lang') lang: string,
  ): Promise<CartModel | Cart> {
    const { newCart, langCart } = await this.cartService.removeFromCart(session, getCartChangeDto, lang);
    session.cart = newCart;
    return langCart;
  }
}

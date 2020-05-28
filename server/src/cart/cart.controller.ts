import { Controller, Get, Query, ValidationPipe, Session, Headers } from '@nestjs/common';

import { CartService } from './cart.service';
import { GetCartChangeDto } from './dto/cart-change.dto';
import { CartModel } from './models/cart.model';

@Controller('api/cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@Session() session, @Headers('lang') lang: string): Promise<CartModel> {
    return this.cartService.getCart(session, lang);
  }

  @Get('/add')
  async addToCart(
    @Session() session,
    @Query(ValidationPipe) getCartChangeDto: GetCartChangeDto,
    @Headers('lang') lang: string
  ): Promise<CartModel> {
    const { newCart, langCart } = await this.cartService.addToCart(session, getCartChangeDto, lang);
    session.cart = newCart;
    return langCart;
  }

  @Get('/remove')
  async removeFromCart(
    @Session() session,
    @Query(ValidationPipe) getCartChangeDto: GetCartChangeDto,
    @Headers('lang') lang: string
  ): Promise<CartModel> {
    const { newCart, langCart } = await this.cartService.removeFromCart(session, getCartChangeDto, lang);
    session.cart = newCart;
    return langCart;
  }
}

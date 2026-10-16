import { Controller, Get, Post, Body, UseGuards, Session, Param, Patch, UnprocessableEntityException, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { OrdersService } from './orders.service';
import { GetUser } from '../auth/utils/get-user.decorator';
import { User } from '../auth/models/user.model';
import { OrderDto } from './dto/order.dto';
import { Order } from './models/order.model';
import { RolesGuard } from '../auth/roles.guard';
import { Cart } from '../cart/utils/cart';
import { prepareCart } from '../shared/utils/prepareUtils';
import type { Order as OrderData, StripeOrderRequest } from '@eshop/shared';
import { CartModel } from '../cart/models/cart.model';
import { ShopSession } from '../shared/types/session';
import { RateLimited } from '../shared/rate-limit/rate-limit';

type OrderResponse = { error: string; result: Order | null; cart: CartModel | Cart };

@Controller('api/orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getOrders(@GetUser() user: User) {
    return this.ordersService.getOrders(user);
  }

  @RateLimited()
  @Post('/add')
  async addOrder(@Body() orderDto: OrderDto, @Session() session: ShopSession, @Headers('lang') lang: string): Promise<OrderResponse> {
    try {
      const successResult = await this.ordersService.addOrder(orderDto, session, lang);
      if (successResult && !successResult.error) {
        const emptyCart = new Cart({ items: [] });
        session.cart = emptyCart;
        return { ...successResult, cart: emptyCart };
      } else {
        return {
          ...successResult,
          cart: prepareCart(session.cart!, lang, session.config),
        };
      }
    } catch (e) {
      throw new UnprocessableEntityException();
    }
  }

  @RateLimited()
  @Post('/stripe')
  async orderWithStripe(@Body() body: StripeOrderRequest, @Session() session: ShopSession, @Headers('lang') lang: string): Promise<OrderResponse> {
    try {
      const successResult = await this.ordersService.orderWithStripe(body, session, lang);

      if (successResult && !successResult.error) {
        const emptyCart = new Cart({ items: [] });
        session.cart = emptyCart;
        return { ...successResult, cart: emptyCart };
      } else {
        return {
          ...successResult,
          cart: prepareCart(session.cart!, lang, session.config),
        };
      }
    } catch (e) {
      throw new UnprocessableEntityException();
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/all')
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/:id')
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch()
  updateOrder(@Body() order: Partial<OrderData> & Pick<OrderData, 'orderId'>) {
    return this.ordersService.updateOrder(order);
  }
}

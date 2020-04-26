import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Session,
    Param,
    Patch,
  } from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/user.model';
import { OrderDto } from './dto/order.dto';
import { Order } from './order.model';
import { RolesGuard } from 'src/auth/roles.guard';

  
  @Controller('api/orders')
  export class OrdersController {
    constructor(private ordersService : OrdersService) {}
  
    @UseGuards(AuthGuard('jwt'))
    @Get()
    getOrders(@GetUser() user: User) {
      return this.ordersService.getOrders(user);
    }

    @Post('/add')
    addOrder(@Body() orderDto: OrderDto, @Session() session): Promise<Order> {
      return this.ordersService.addOrder(orderDto, session.cart);
    }


    @Post('/stripe')
    orderWithStripe(@Body() body, @Session() session): Promise<any> {
      return this.ordersService.orderWithStripe(body, session.cart);
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
    updateOrder(@Body() order) {
      return this.ordersService.updateOrder(order);
    }

  }
  
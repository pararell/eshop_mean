import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from './order.model';
import { Model } from 'mongoose';
import { User } from '../auth/user.model';
import { OrderDto } from './dto/order.dto';
import Mailer from '../shared/utils/mailer';


@Injectable()
export class OrdersService {
  constructor(
      @InjectModel('Order') private orderModel: Model<Order>) {}

  async getOrders(user: User): Promise<Order[]> {
    const orders = await this.orderModel.find({ _user: user._id });
    return orders;
  }
  
  async addOrder(orderDto: OrderDto, cart): Promise<Order> {
    const newOrder = await new this.orderModel(this.createOrder(orderDto, cart));
    newOrder.save();
    try {
    this.sendmail(newOrder, cart);
    } catch {
      console.log('Email send error')
    }
  
    return newOrder;
  }

  async getAllOrders(): Promise<Order[]> {
    const orders = await this.orderModel.find({ });
    return orders;
  }


  async getOrderById(id: string): Promise<Order>{
    const order = await this.orderModel.findOne({orderId : id});
    return order;
  }

  async updateOrder(reqorder) {
    const order = this.orderModel.findOneAndUpdate({orderId: reqorder.orderId}, reqorder, {new: true})
    return order;
  }


  private createOrder = (orderDto, cart) => {
    const { addresses, currency, email, userId } = orderDto;
    const orderId = 'order' + new Date().getTime() + 't' + Math.floor(Math.random() * 1000 + 1);
    const date = Date.now();
    const deliveryAdress = addresses[0];
    const addUser = userId ? {_user: userId} : {};

    return {
        orderId,
        amount          : cart.totalPrice,
        currency,
        dateAdded       : date,
        cart,
        status          : 'NEW',
        description     : 'PAY_ON_DELIVERY',
        customerEmail   : email,
        outcome         : {
            seller_message: 'Payment on delivery'
        },
        source          : {
            name                : deliveryAdress.name,
            address_city        : deliveryAdress.city,
            address_country     : deliveryAdress.country,
            address_line1       : deliveryAdress.line1,
            address_line2       : deliveryAdress.line2,
            address_zip         : deliveryAdress.zip,
            object              : 'deliver'
        },
        addresses,
        ...addUser
    }
  }


  private sendmail = (order, cart) => {
      const emailType = {
        subject: 'Order',
        cart,
        currency  : order.currency,
        orderId   : order.orderId,
        adress    : order.addresses[0],
        notes     : order.notes,
        date      : new Date()
      };
    
      const mailer = new Mailer(order.customerEmail, emailType);
    
      mailer.send();
  }

  
}

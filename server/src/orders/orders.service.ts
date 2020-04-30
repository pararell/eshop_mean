import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';

import { Order } from './models/order.model';
import { User } from '../auth/models/user.model';
import { OrderDto } from './dto/order.dto';
import Mailer from '../shared/utils/mailer';
import { Cart } from '../cart/utils/cart';


const secret = process.env.STRIPE_SECRETKEY;
export const stripe = new Stripe(secret, {apiVersion: '2020-03-02'});

@Injectable()
export class OrdersService {
  constructor(
      @InjectModel('Order') private orderModel: Model<Order>) {}

  async getOrders(user: User): Promise<Order[]> {
    const orders = await this.orderModel.find({ _user: user._id });
    return orders;
  }

  async addOrder(orderDto: OrderDto, cart: Cart): Promise<Order> {
    const newOrder = await new this.orderModel(this.createOrder(orderDto, cart));
    newOrder.save();
    try {
    this.sendmail(newOrder.customerEmail, newOrder, cart);

      if (process.env.ADMIN_EMAILS) {
        process.env.ADMIN_EMAILS
          .split(',')
          .filter(Boolean)
          .forEach(email => {
            this.sendmail(email, newOrder, cart);
          });
      }
    } catch {
      console.log('Email send error')
    }

    return newOrder;
  }

  async getAllOrders(): Promise<Order[]> {
    const orders = await this.orderModel.find({ });
    return orders;
  }


  async orderWithStripe(body, cart: Cart) {
    const charge = await stripe.charges.create({
      amount        : cart.totalPrice * 100,
      currency      : 'eur',
      description   : 'Credit Card Payment',
      source        : body.token.id,
      capture       : false
    });
      const requestOrder = {...body, cardId: charge.id};
      const newOrder = await new this.orderModel(this.createOrder(requestOrder, cart));

      if (charge && newOrder) {
        try {
          const capturePayment = await stripe.charges.capture(charge.id);
          this.sendmail(newOrder.customerEmail, newOrder, cart);

          if (process.env.ADMIN_EMAILS) {
            process.env.ADMIN_EMAILS
              .split(',')
              .filter(Boolean)
              .forEach(email => {
                this.sendmail(email, newOrder, cart);
              });
          }
          return newOrder;
        } catch {
          return {newOrder, status: 'UNPAID'};
        }
      }
      return;
  }


  async getOrderById(id: string): Promise<Order>{
    const order = await this.orderModel.findOne({orderId : id});
    return order;
  }

  async updateOrder(reqorder) {
    const order = this.orderModel.findOneAndUpdate({orderId: reqorder.orderId}, reqorder, {new: true})
    return order;
  }


  private createOrder = (orderDto: OrderDto, cart: Cart) => {
    const { addresses, currency, email, userId, cardId } = orderDto;
    const orderId = 'order' + new Date().getTime() + 't' + Math.floor(Math.random() * 1000 + 1);
    const date = Date.now();
    const deliveryAdress = addresses[0];
    const addUser = userId ? {_user: userId} : {};
    const addCard = cardId ? {cardId} : {};

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
        ...addUser,
        ...addCard
    }
  }


  private sendmail = (email: string, order: Order, cart: Cart) => {
      const emailType = {
        subject: 'Order',
        cart,
        currency  : order.currency,
        orderId   : order.orderId,
        adress    : order.addresses[0],
        notes     : order.notes,
        date      : new Date()
      };

      const mailer = new Mailer(email, emailType);

      mailer.send();
  }


}

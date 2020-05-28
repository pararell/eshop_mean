import { Logger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';

import { Order, OrderStatus } from './models/order.model';
import { User } from '../auth/models/user.model';
import { OrderDto } from './dto/order.dto';
import { sendMsg } from '../shared/utils/email/mailer';
import { Cart } from '../cart/utils/cart';
import { prepareCart } from '../shared/utils/prepareUtils';
import { CartModel } from '../cart/models/cart.model';


const secret = process.env.STRIPE_SECRETKEY;
export const stripe = new Stripe(secret, {apiVersion: '2020-03-02'});

@Injectable()
export class OrdersService {
  private logger = new Logger('OrdersService');
  constructor(
      @InjectModel('Order') private orderModel: Model<Order>) {}

  async getOrders(user: User): Promise<Order[]> {
    const orders = await this.orderModel.find({ _user: user._id });
    return orders;
  }

  async addOrder(orderDto: OrderDto, session, lang): Promise<{error: string; result: Order}> {
    const { cart, config } = session;
    const cartForLang = prepareCart(cart, lang, config);
    const newOrder = await new this.orderModel(this.createOrder(orderDto, cartForLang, 'PAYMENT_ON_DELIVERY'));
    newOrder.save();
    try {
      this.sendmail(newOrder.customerEmail, newOrder, cartForLang);

      if (process.env.ADMIN_EMAILS) {
        process.env.ADMIN_EMAILS
          .split(',')
          .filter(Boolean)
          .forEach(email => {
            this.sendmail(email, newOrder, cartForLang);
          });
      }
    } catch (error) {
      this.logger.error(error.stack + ' Failed to send email');
    }

    return { error: '', result: newOrder };
  }

  async getAllOrders(): Promise<Order[]> {
    const orders = await this.orderModel.find({ });
    return orders;
  }

  async orderWithStripe(body, session, lang: string): Promise<{error: string; result: Order}> {
    const { cart, config } = session;
    const cartForLang = prepareCart(cart, lang, config);
    const charge = await stripe.charges.create({
      amount        : cartForLang.totalPrice * 100,
      currency      : body.currency,
      description   : 'Credit Card Payment',
      source        : body.token.id,
      capture       : false
    });
      const requestOrder = {...body, cardId: charge.id};

      if (charge) {
        try {
          const newOrder = await new this.orderModel(this.createOrder(requestOrder, cartForLang, 'WITH_PAYMENT'));
          const capturePayment = await stripe.charges.capture(charge.id);
          if (capturePayment) {
            newOrder.save();
            this.sendmail(newOrder.customerEmail, newOrder, cartForLang);

            if (process.env.ADMIN_EMAILS) {
              process.env.ADMIN_EMAILS
                .split(',')
                .filter(Boolean)
                .forEach(email => {
                  this.sendmail(email, newOrder, cartForLang);
                });
            }
        }
          return { error: '', result: newOrder };
        } catch {
          return { error: 'ORDER_CREATION_FAIL', result: null };
        }
      } else {
        return { error: 'ORDER_CREATION_FAIL', result: null };
      }
  }


  async getOrderById(id: string): Promise<Order> {
    const order = await this.orderModel.findOne({orderId : id});
    return order;
  }

  async updateOrder(reqorder): Promise<Order> {
    const order = this.orderModel.findOneAndUpdate({orderId: reqorder.orderId}, reqorder, {new: true})
    return order;
  }


  private createOrder = (orderDto: OrderDto, cart: CartModel, type: string) => {
    const { addresses, currency, email, userId, cardId, notes } = orderDto;
    const orderId = 'order' + new Date().getTime() + 't' + Math.floor(Math.random() * 1000 + 1);
    const date = Date.now();
    const addUser = userId ? { _user: userId } : {};
    const addCard = cardId ? { cardId } : {};

    return {
        orderId,
        amount : cart.totalPrice,
        currency,
        dateAdded : date,
        cart,
        status : type === 'WITH_PAYMENT' ? OrderStatus.PAID : OrderStatus.NEW,
        type,
        notes,
        customerEmail : email,
        outcome : {
            // eslint-disable-next-line @typescript-eslint/camelcase
            seller_message: type
        },
        addresses,
        ...addUser,
        ...addCard
    }
  }


  private sendmail = async (email: string, order: Order, cart: CartModel) => {
      const emailType = {
        subject: 'Order',
        cart,
        currency  : order.currency,
        orderId   : order.orderId,
        address    : order.addresses[0],
        notes     : order.notes,
        date      : new Date()
      };

      const mailSended = await sendMsg(email, emailType);
      return mailSended;
  }

}

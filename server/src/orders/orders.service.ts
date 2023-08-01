import { Logger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';

import { Order, OrderStatus } from './models/order.model';
import { User } from '../auth/models/user.model';
import { OrderDto } from './dto/order.dto';
import { sendMsg } from '../shared/utils/email/mailer';
import { prepareCart } from '../shared/utils/prepareUtils';
import { CartModel } from '../cart/models/cart.model';
import { Translation } from '../translations/translation.model';

const secret = process.env.STRIPE_SECRETKEY;
export const stripe = new Stripe(secret, { apiVersion: '2020-08-27' });

@Injectable()
export class OrdersService {
  private logger = new Logger('OrdersService');
  constructor(
    @InjectModel('Order') private orderModel: Model<Order>,
    @InjectModel('Translation') private translationModel: Model<Translation>,
  ) {}

  async getOrders(user: User): Promise<Order[]> {
    const orders = await this.orderModel.find({ _user: user._id }).sort('-dateAdded');
    return orders;
  }

  async addOrder(orderDto: OrderDto, session, lang: string): Promise<{ error: string; result: Order }> {
    const { cart, config } = session;
    const cartForLang = prepareCart(cart, lang, config);
    const newOrder = await new this.orderModel(this.createOrder(orderDto, cartForLang, 'PAYMENT_ON_DELIVERY'));
    newOrder.save();
    try {
      const translations = await this.translationModel.findOne({ lang });

      this.sendmail(newOrder.customerEmail, newOrder, cartForLang, translations);

      if (process.env.ADMIN_EMAILS) {
        process.env.ADMIN_EMAILS.split(',')
          .filter(Boolean)
          .forEach((email) => {
            this.sendmail(email, newOrder, cartForLang, translations);
          });
      }
    } catch (error) {
      this.logger.error(error.stack + ' Failed to send email');
    }

    return { error: '', result: newOrder };
  }

  async getAllOrders(): Promise<Order[]> {
    const orders = await this.orderModel.find({}).sort('-dateAdded');
    return orders;
  }

  async orderWithStripe(body, session, lang: string): Promise<{ error: string; result: Order }> {
    const { cart, config } = session;
    const cartForLang = prepareCart(cart, lang, config);
    const charge = await stripe.charges.create({
      amount: cartForLang.totalPrice * 100,
      currency: body.currency,
      description: 'Credit Card Payment',
      source: body.token.id,
      capture: false,
    });
    const requestOrder = { ...body, cardId: charge.id };

    if (charge) {
      try {
        const newOrder = await new this.orderModel(this.createOrder(requestOrder, cartForLang, 'WITH_PAYMENT'));
        const capturePayment = await stripe.charges.capture(charge.id);
        if (capturePayment) {
          newOrder.save();

          const translations = await this.translationModel.findOne({ lang });
          this.sendmail(newOrder.customerEmail, newOrder, cartForLang, translations);

          if (process.env.ADMIN_EMAILS) {
            process.env.ADMIN_EMAILS.split(',')
              .filter(Boolean)
              .forEach((email) => {
                this.sendmail(email, newOrder, cartForLang, translations);
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
    const order = await this.orderModel.findOne({ orderId: id });
    return order;
  }

  async updateOrder(reqOrder): Promise<Order> {
    const order = this.orderModel.findOneAndUpdate({ orderId: reqOrder.orderId }, reqOrder, { new: true });
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
      amount: cart.totalPrice,
      currency,
      dateAdded: date,
      cart,
      status: type === 'WITH_PAYMENT' ? OrderStatus.PAID : OrderStatus.NEW,
      type,
      notes,
      customerEmail: email,
      outcome: {
        seller_message: type,
      },
      addresses,
      ...addUser,
      ...addCard,
    };
  };

  private sendmail = async (email: string, order: Order, cart: CartModel, translations) => {
    const emailType = {
      subject: 'Order',
      cart,
      currency: order.currency,
      orderId: order.orderId,
      address: order.addresses[0],
      notes: order.notes,
      date: new Date(),
    };

    const mailSended = await sendMsg(email, emailType, translations);
    return mailSended;
  };
}

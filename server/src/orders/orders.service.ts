import { Logger, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { OrderDto } from './dto/order.dto';
import { sendMsg } from '../shared/utils/email/mailer';
import { prepareCart } from '../shared/utils/prepareUtils';
import { CartModel } from '../cart/models/cart.model';
import { Translation } from '../entities/translation.entity';

const secret = process.env.STRIPE_SECRETKEY;
export const stripe = new Stripe(secret, { apiVersion: '2020-08-27' });

@Injectable()
export class OrdersService {
  private logger = new Logger('OrdersService');
  constructor(
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(Translation) private translationRepository: Repository<Translation>,
  ) {}

  async getOrders(user: User): Promise<Order[]> {
    const orders = await this.orderRepository.find({
      where: { _user: user._id },
      order: { dateAdded: 'DESC' },
    });
    return orders;
  }

  async addOrder(
    orderDto: OrderDto,
    session,
    lang: string,
  ): Promise<{ error: string; result: Order }> {
    const { cart, config } = session;
    const cartForLang = prepareCart(cart, lang, config);
    const orderData = this.createOrder(orderDto, cartForLang, 'PAYMENT_ON_DELIVERY');
    const newOrder = new Order();
    Object.assign(newOrder, orderData);
    await this.orderRepository.save(newOrder);

    try {
      const translations = await this.translationRepository.findOne({ where: { lang } });

      this.sendmail(
        newOrder.customerEmail,
        newOrder,
        cartForLang,
        translations,
      );

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
    const orders = await this.orderRepository.find({ order: { dateAdded: 'DESC' } });
    return orders;
  }

  async orderWithStripe(
    body,
    session,
    lang: string,
  ): Promise<{ error: string; result: Order }> {
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
        const orderData = this.createOrder(requestOrder, cartForLang, 'WITH_PAYMENT');
        const newOrder = new Order();
        Object.assign(newOrder, orderData);

        const capturePayment = await stripe.charges.capture(charge.id);
        if (capturePayment) {
          await this.orderRepository.save(newOrder);

          const translations = await this.translationRepository.findOne({ where: { lang } });
          this.sendmail(
            newOrder.customerEmail,
            newOrder,
            cartForLang,
            translations,
          );

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
    const order = await this.orderRepository.findOne({ where: { orderId: id } });
    return order;
  }

  async updateOrder(reqOrder): Promise<Order> {
    await this.orderRepository.update(
      { orderId: reqOrder.orderId },
      reqOrder,
    );
    return this.orderRepository.findOne({ where: { orderId: reqOrder.orderId } });
  }

  private createOrder = (orderDto: OrderDto, cart: CartModel, type: string) => {
    const { addresses, currency, email, userId, cardId, notes } = orderDto;
    const orderId =
      'order' +
      new Date().getTime() +
      't' +
      Math.floor(Math.random() * 1000 + 1);
    const date = new Date();
    const addUser = userId ? { _user: userId } : {};
    const addCard = cardId ? { cardId } : {};

    return {
      orderId,
      amount: cart.totalPrice,
      currency,
      dateAdded: date,
      cart,
      status: type === 'WITH_PAYMENT' ? 'PAID' : 'NEW',
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

  private sendmail = async (
    email: string,
    order: Order,
    cart: CartModel,
    translations,
  ) => {
    const emailType = {
      subject: 'Order',
      cart,
      currency: order.currency,
      orderId: order.orderId,
      address: order.addresses?.[0],
      notes: order.notes,
      date: new Date(),
    };

    const mailSended = await sendMsg(email, emailType, translations);
    return mailSended;
  };
}
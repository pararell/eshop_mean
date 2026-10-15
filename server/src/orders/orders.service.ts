import { Inject, Logger, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { Order, OrderStatus } from './models/order.model';
import { User } from '../auth/models/user.model';
import { OrderDto } from './dto/order.dto';
import { sendMsg } from '../shared/utils/email/mailer';
import { prepareCart } from '../shared/utils/prepareUtils';
import { currencyForLang } from '../shared/constans';
import { CartModel } from '../cart/models/cart.model';
import { Translation } from '../translations/translation.model';
import type { Order as OrderData, OrderRequest, StripeOrderRequest } from '@eshop/shared';
import type { OrderEmail } from '../shared/utils/email/email.types';
import { ShopSession } from '../shared/types/session';
import { Database, DRIZZLE } from '../db/database.module';
import { orderValues, toOrderDoc } from '../db/mappers';
import { orders } from '../db/schema';
import { findTranslation } from '../translations/translation.queries';

export interface OrderOutcome {
  error: string;
  result: Order | null;
}

const secret = process.env.STRIPE_SECRETKEY;
export const stripe = new Stripe(secret!, { apiVersion: '2020-08-27' });

@Injectable()
export class OrdersService {
  private logger = new Logger('OrdersService');
  constructor(@Inject(DRIZZLE) private db: Database) {}

  private async insertOrder(order: ReturnType<OrdersService['createOrder']>): Promise<Order> {
    const [row] = await this.db
      .insert(orders)
      .values(orderValues(order) as typeof orders.$inferInsert)
      .returning();
    return toOrderDoc(row);
  }

  async getOrders(user: User): Promise<Order[]> {
    const rows = await this.db.select().from(orders).where(eq(orders.userId, user._id)).orderBy(desc(orders.createdAt));
    return rows.map(toOrderDoc);
  }

  async addOrder(orderDto: OrderDto, session: ShopSession, lang: string): Promise<OrderOutcome> {
    const { cart, config } = session;
    // Throws without a cart; callers turn that into 422 (current behavior)
    const cartForLang = prepareCart(cart!, lang, config);
    const newOrder = await this.insertOrder(this.createOrder(orderDto, cartForLang, 'PAYMENT_ON_DELIVERY', currencyForLang(lang)));
    try {
      const translations = await findTranslation(this.db, lang);

      this.sendmail(newOrder.customerEmail, newOrder, cartForLang, translations);

      if (process.env.ADMIN_EMAILS) {
        process.env.ADMIN_EMAILS.split(',')
          .filter(Boolean)
          .forEach((email) => {
            this.sendmail(email, newOrder, cartForLang, translations);
          });
      }
    } catch (error) {
      this.logger.error((error as Error).stack + ' Failed to send email');
    }

    return { error: '', result: newOrder };
  }

  async getAllOrders(): Promise<Order[]> {
    const rows = await this.db.select().from(orders).orderBy(desc(orders.createdAt));
    return rows.map(toOrderDoc);
  }

  async orderWithStripe(body: StripeOrderRequest, session: ShopSession, lang: string): Promise<OrderOutcome> {
    const { cart, config } = session;
    // Throws without a cart; callers turn that into 422 (current behavior)
    const cartForLang = prepareCart(cart!, lang, config);
    const charge = await stripe.charges.create({
      // Stripe expects an integer amount in minor units; totals are float major units (audit BUG-01)
      amount: Math.round(cartForLang.totalPrice * 100),
      currency: currencyForLang(lang),
      description: 'Credit Card Payment',
      source: body.token.id,
      capture: false,
    });
    const requestOrder = { ...body, cardId: charge.id };

    if (charge) {
      try {
        const orderToSave = this.createOrder(requestOrder, cartForLang, 'WITH_PAYMENT', currencyForLang(lang));
        // Known risk (audit BUG-02): the charge is captured before the order is stored
        const capturePayment = await stripe.charges.capture(charge.id);
        let newOrder = orderToSave as unknown as Order;
        if (capturePayment) {
          newOrder = await this.insertOrder(orderToSave);

          const translations = await findTranslation(this.db, lang);
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

  async getOrderById(id: string): Promise<Order | null> {
    const [row] = await this.db.select().from(orders).where(eq(orders.orderNumber, id));
    return row ? toOrderDoc(row) : null;
  }

  async updateOrder(reqOrder: Partial<OrderData> & Pick<OrderData, 'orderId'>): Promise<Order | null> {
    // Like findOneAndUpdate({ orderId }, body, { new: true }): known fields only; null if not found
    const { orderId: _orderId, ...changes } = reqOrder;
    const values = orderValues(changes);
    const [row] = Object.keys(values).length
      ? await this.db
          .update(orders)
          .set(values)
          .where(eq(orders.orderNumber, String(reqOrder.orderId)))
          .returning()
      : await this.db
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, String(reqOrder.orderId)));
    return row ? toOrderDoc(row) : null;
  }

  private createOrder = (orderDto: OrderRequest, cart: CartModel, type: string, currency: string) => {
    const { addresses, email, userId, cardId, notes } = orderDto;
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

  private sendmail = async (email: string, order: Order, cart: CartModel, translations: Translation | null) => {
    const emailType: OrderEmail = {
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

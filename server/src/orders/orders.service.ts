import { Inject, Logger, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { Order, OrderStatus } from './models/order.model';
import { User } from '../auth/models/user.model';
import { OrderDto } from './dto/order.dto';
import { adminEmails, sendMail } from '../shared/utils/email/mailer';
import { prepareCart } from '../shared/utils/prepareUtils';
import { currencyForLang } from '../shared/constans';
import { CartModel } from '../cart/models/cart.model';
import type { Order as OrderData, OrderRequest } from '@eshop/shared';
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

/** Order number shown to customers and used in URLs ('order<ms>t<rand>') */
export const newOrderId = () => 'order' + new Date().getTime() + 't' + Math.floor(Math.random() * 1000 + 1);

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
    await this.notifyOrder(newOrder, cartForLang, lang);

    return { error: '', result: newOrder };
  }

  /** Order emails to the customer and ADMIN_EMAILS; failures are logged, never thrown */
  /** Order email to the customer and every ADMIN_EMAILS address (one Resend request); never throws */
  async notifyOrder(order: Order, cartForLang: CartModel, lang: string): Promise<void> {
    try {
      const translations = await findTranslation(this.db, lang);
      const emailType: OrderEmail = {
        subject: 'Order',
        cart: cartForLang,
        currency: order.currency,
        orderId: order.orderId,
        address: order.addresses?.[0],
        notes: order.notes,
        date: new Date(),
      };
      // Resend ignores a repeat with the same key for 24 h: an order is never announced twice
      await sendMail([order.customerEmail, ...adminEmails()], emailType, translations, `order-${order.orderId}`);
    } catch (error) {
      this.logger.error((error as Error).stack + ' Failed to send email');
    }
  }

  async getAllOrders(): Promise<Order[]> {
    const rows = await this.db.select().from(orders).orderBy(desc(orders.createdAt));
    return rows.map(toOrderDoc);
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
    const orderId = newOrderId();
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
}

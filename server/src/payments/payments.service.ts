import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type Stripe from 'stripe';
import type { LanguageCode, LocalizedCart, PaymentCompleteResponse, PaymentIntentResponse } from '@eshop/shared';

import { Database, DRIZZLE } from '../db/database.module';
import { orderValues, toOrderDoc } from '../db/mappers';
import { orders, stripeEvents } from '../db/schema';
import { newOrderId, OrdersService } from '../orders/orders.service';
import { Order } from '../orders/models/order.model';
import { Cart } from '../cart/utils/cart';
import { prepareCart } from '../shared/utils/prepareUtils';
import { currencyForLang, languages } from '../shared/constans';
import { ShopSession } from '../shared/types/session';
import { PaymentIntentDto } from './dto/payment.dto';
import { fromMinor, STRIPE, toMinor } from './stripe.client';

/** Order states in which the customer can (still) pay */
const PAYABLE = ['PENDING_PAYMENT', 'PAYMENT_FAILED'] as const;
/** PaymentIntent states in which amount/currency can still change */
const UPDATABLE_INTENT = ['requires_payment_method', 'requires_confirmation', 'requires_action'];
/** Order states that can be refunded */
const REFUNDABLE = ['PAID', 'SHIPPING', 'COMPLETED', 'REFUNDED'];

const emptyCart = () => new Cart({ items: [] });

/**
 * Card payments with the Stripe Payment Element (docs/payments.md).
 *
 * 1. `createIntent`: when the customer presses Pay, a PENDING_PAYMENT order and a PaymentIntent are
 *    created from the session cart (amounts always computed here). Retries reuse both.
 * 2. Stripe.js confirms in the browser (3-D Secure etc.).
 * 3. The order becomes PAID through `markPaid`, triggered by the `payment_intent.succeeded` webhook
 *    or by `complete` (the browser coming back): whichever is first; emails are sent once.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    @Inject(DRIZZLE) private db: Database,
    @Inject(STRIPE) private stripe: Stripe | null,
    private ordersService: OrdersService,
  ) {
    if (!stripe) this.logger.warn('Card payments are disabled: STRIPE_SECRETKEY is not set');
    if (stripe && !process.env.STRIPE_WEBHOOK_SECRET) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET is not set: webhooks are rejected, payments are confirmed when the customer returns');
    }
  }

  private client(): Stripe {
    if (!this.stripe) throw new ServiceUnavailableException('Card payments are not available right now.');
    return this.stripe;
  }

  private async findOrder(by: { orderId: string } | { paymentIntentId: string }): Promise<Order | null> {
    const [row] = await this.db
      .select()
      .from(orders)
      .where('orderId' in by ? eq(orders.orderNumber, by.orderId) : eq(orders.paymentIntentId, by.paymentIntentId));
    return row ? toOrderDoc(row) : null;
  }

  // 1. Intent ------------------------------------------------------------------------------------

  async createIntent(dto: PaymentIntentDto, session: ShopSession, lang: string, userId: string | null): Promise<PaymentIntentResponse> {
    const stripe = this.client();
    const cart = session.cart?.items?.length ? prepareCart(session.cart, lang, session.config) : null;
    if (!cart || !cart.items.length || cart.totalPrice <= 0) {
      throw new UnprocessableEntityException('Your cart is empty.');
    }
    const currency = currencyForLang(lang);
    const details = {
      amount: cart.totalPrice,
      currency,
      cart,
      customerEmail: dto.email,
      addresses: dto.addresses,
      notes: dto.notes ?? '',
    };

    // A retry (declined card, changed cart or address): update the session's pending order and intent
    const pending = session.payment ? await this.findOrder({ orderId: session.payment.orderId }) : null;
    if (pending?.paymentIntentId && (PAYABLE as readonly string[]).includes(pending.status)) {
      const intent = await stripe.paymentIntents.retrieve(pending.paymentIntentId);
      if (UPDATABLE_INTENT.includes(intent.status)) {
        const updated = await stripe.paymentIntents.update(intent.id, {
          amount: toMinor(cart.totalPrice),
          currency: currency.toLowerCase(),
          receipt_email: dto.email,
        });
        await this.db
          .update(orders)
          .set(orderValues({ ...details, status: 'PENDING_PAYMENT' }))
          .where(eq(orders.orderNumber, pending.orderId));
        return { orderId: pending.orderId, clientSecret: updated.client_secret!, amount: cart.totalPrice, currency };
      }
    }

    const orderId = newOrderId();
    await this.db.insert(orders).values(
      orderValues({
        ...details,
        orderId,
        status: 'PENDING_PAYMENT',
        type: 'WITH_PAYMENT',
        outcome: { seller_message: 'WITH_PAYMENT' },
        ...(userId ? { _user: userId } : {}),
      }) as typeof orders.$inferInsert,
    );

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create(
        {
          amount: toMinor(cart.totalPrice),
          currency: currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          receipt_email: dto.email,
          description: `Order ${orderId}`,
          metadata: { orderId, lang },
        },
        // Retried requests (network errors) never create a second intent for the same order
        { idempotencyKey: `order-${orderId}` },
      );
    } catch (error) {
      this.logger.error(`Creating the PaymentIntent for ${orderId} failed: ${(error as Error).message}`);
      await this.db
        .update(orders)
        .set({ status: 'PAYMENT_FAILED', description: 'Payment could not be started' })
        .where(eq(orders.orderNumber, orderId));
      throw new BadGatewayException('Card payment could not be started. Please try again.');
    }

    await this.db.update(orders).set({ paymentIntentId: intent.id }).where(eq(orders.orderNumber, orderId));
    session.payment = { orderId };
    return { orderId, clientSecret: intent.client_secret!, amount: cart.totalPrice, currency };
  }

  // 3a. The browser is back ----------------------------------------------------------------------

  async complete(orderId: string, session: ShopSession, lang: string): Promise<PaymentCompleteResponse> {
    // Only the session that started the payment may see it (order numbers are not secret)
    if (session.payment?.orderId !== orderId) throw new NotFoundException('Order not found.');
    const order = await this.findOrder({ orderId });
    if (!order?.paymentIntentId) throw new NotFoundException('Order not found.');

    const intent = await this.client().paymentIntents.retrieve(order.paymentIntentId);
    const latest = intent.status === 'succeeded' ? ((await this.markPaid(intent)) ?? (await this.findOrder({ orderId }))!) : order;

    let cart: PaymentCompleteResponse['cart'];
    if (latest.status === 'PAID') {
      session.cart = emptyCart();
      delete session.payment;
      cart = session.cart;
    } else {
      cart = session.cart?.items?.length ? prepareCart(session.cart, lang, session.config) : emptyCart();
    }
    return { order: latest, paymentStatus: intent.status, cart };
  }

  // 3b. Webhooks ---------------------------------------------------------------------------------

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<{ received: true; duplicate?: true }> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('Webhooks are not configured.');
    if (!rawBody || !signature) throw new BadRequestException('Missing Stripe signature.');

    let event: Stripe.Event;
    try {
      event = this.client().webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      this.logger.warn(`Rejected a webhook: ${(error as Error).message}`);
      throw new BadRequestException('Invalid Stripe signature.');
    }

    // Stripe may deliver an event more than once; handlers are idempotent too, so a race is harmless
    const [seen] = await this.db.select({ id: stripeEvents.id }).from(stripeEvents).where(eq(stripeEvents.id, event.id));
    if (seen) return { received: true, duplicate: true };

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.markPaid(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.markFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await this.db
          .update(orders)
          .set({ status: 'CANCELED' })
          .where(and(eq(orders.paymentIntentId, event.data.object.id), inArray(orders.status, [...PAYABLE])));
        break;
      case 'charge.refunded':
        await this.applyRefund(event.data.object);
        break;
      default:
        // Only the events above are subscribed; anything else is acknowledged and ignored
        break;
    }

    await this.db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
    return { received: true };
  }

  /** PENDING_PAYMENT/PAYMENT_FAILED → PAID exactly once (conditional update); sends the order emails then */
  private async markPaid(intent: Stripe.PaymentIntent): Promise<Order | null> {
    const charge = typeof intent.latest_charge === 'string' ? intent.latest_charge : (intent.latest_charge?.id ?? null);
    const [row] = await this.db
      .update(orders)
      .set({ status: 'PAID', cardId: charge, description: null })
      .where(and(eq(orders.paymentIntentId, intent.id), inArray(orders.status, [...PAYABLE])))
      .returning();
    if (!row) return null; // already paid (or not ours)

    const order = toOrderDoc(row);
    if (intent.amount_received !== toMinor(order.amount) || intent.currency !== order.currency.toLowerCase()) {
      this.logger.error(
        `Order ${order.orderId} paid ${intent.amount_received} ${intent.currency} but expected ${toMinor(order.amount)} ${order.currency}; check it in Stripe`,
      );
    }
    const lang = (languages as string[]).includes(intent.metadata?.lang) ? (intent.metadata.lang as LanguageCode) : languages[0];
    void this.ordersService.notifyOrder(order, order.cart as LocalizedCart, lang);
    this.logger.log(`Order ${order.orderId} paid (${intent.id})`);
    return order;
  }

  private async markFailed(intent: Stripe.PaymentIntent): Promise<void> {
    await this.db
      .update(orders)
      .set({ status: 'PAYMENT_FAILED', description: intent.last_payment_error?.message ?? 'Payment failed' })
      .where(and(eq(orders.paymentIntentId, intent.id), eq(orders.status, 'PENDING_PAYMENT')));
  }

  /** Stripe's charge has the authoritative refunded total; applying it twice changes nothing */
  private async applyRefund(charge: Stripe.Charge): Promise<void> {
    const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!intentId) return;
    await this.db
      .update(orders)
      .set({ amountRefunded: fromMinor(charge.amount_refunded), ...(charge.refunded ? { status: 'REFUNDED' as const } : {}) })
      .where(eq(orders.paymentIntentId, intentId));
  }

  // Admin refunds --------------------------------------------------------------------------------

  async refund(orderId: string, amount: number | undefined): Promise<Order> {
    const stripe = this.client();
    const order = await this.findOrder({ orderId });
    if (!order) throw new NotFoundException('Order not found.');
    if (!order.paymentIntentId || !REFUNDABLE.includes(order.status)) {
      throw new ConflictException('Only paid card orders can be refunded.');
    }
    const refunded = order.amount_refunded ?? 0;
    const remaining = Math.round((order.amount - refunded) * 100) / 100;
    if (remaining <= 0) throw new ConflictException('This order is already fully refunded.');
    const toRefund = amount ?? remaining;
    if (toRefund > remaining) throw new UnprocessableEntityException(`At most ${remaining} ${order.currency} can be refunded.`);

    try {
      await stripe.refunds.create(
        { payment_intent: order.paymentIntentId, amount: toMinor(toRefund), metadata: { orderId } },
        // The same refund (e.g. a double click) is only made once
        { idempotencyKey: `refund-${orderId}-${toMinor(refunded)}-${toMinor(toRefund)}` },
      );
    } catch (error) {
      this.logger.error(`Refund for ${orderId} failed: ${(error as Error).message}`);
      throw new BadGatewayException(`Stripe refused the refund: ${(error as Error).message}`);
    }

    const total = Math.round((refunded + toRefund) * 100) / 100;
    const [row] = await this.db
      .update(orders)
      .set({ amountRefunded: total, ...(total >= order.amount ? { status: 'REFUNDED' as const } : {}) })
      .where(eq(orders.orderNumber, orderId))
      .returning();
    this.logger.log(`Refunded ${toRefund} ${order.currency} of order ${orderId}`);
    return toOrderDoc(row);
  }
}

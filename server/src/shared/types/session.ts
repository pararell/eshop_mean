import type { Session, SessionData } from 'express-session';
import type { SessionCart } from '@eshop/shared';

declare module 'express-session' {
  interface SessionData {
    /** Shopping cart (see cart/utils/cart.ts) */
    cart: SessionCart;
    /** Admin image library (see admin/utils/images.ts) */
    images: { all: string[] };
    /** The card order this session is paying (payments/payments.service.ts) */
    payment: { orderId: string };
  }
}

/** Type of `@Session()` parameters. */
export type ShopSession = Session & Partial<SessionData>;

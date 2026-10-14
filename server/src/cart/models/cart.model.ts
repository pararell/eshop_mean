import type { LocalizedCart, SessionCart, SessionCartItem } from '@eshop/shared';

export type { SessionCart, SessionCartItem };

/** Cart prepared for one language (API response). */
export type CartModel = LocalizedCart;

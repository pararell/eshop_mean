import type { Address, LocalizedCart } from '@eshop/shared';

export interface OrderEmail {
  subject: 'Order';
  cart: LocalizedCart;
  currency: string;
  orderId: string;
  address?: Address;
  notes?: string;
  date: Date;
}

export interface ContactEmail {
  subject: 'Contact';
  cart?: unknown;
  contact: { email: string; name?: string; notes?: string };
  date: Date;
}

export type EmailType = OrderEmail | ContactEmail;

/** Translation document for the email language (may be missing) */
export type EmailTranslations = { keys: Record<string, string> } | null | undefined;

import type { Address } from '@eshop/shared';
import type { OrderDoc } from '../../db/mappers';

export type { Address };

export enum OrderStatus {
  NEW = 'NEW',
  PAID = 'PAID',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUNDED = 'REFUNDED',
}

export type Order = OrderDoc;

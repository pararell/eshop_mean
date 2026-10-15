import type { Address } from '@eshop/shared';
import type { OrderDoc } from '../../db/mappers';

export type { Address };

export enum OrderStatus {
  NEW = 'NEW',
  PAID = 'PAID',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export type Order = OrderDoc;

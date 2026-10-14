import { Document } from 'mongoose';
import type { Address, Order as OrderData } from '@eshop/shared';

export type { Address };

export enum OrderStatus {
  NEW = 'NEW',
  PAID = 'PAID',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export interface Order extends Document<string>, Omit<OrderData, '_id' | '_user'> {
  _id: string;
  _user?: string | Document['_id'];
}

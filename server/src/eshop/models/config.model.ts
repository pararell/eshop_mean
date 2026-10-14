import { Document } from 'mongoose';
import type { ShopConfig } from '@eshop/shared';

export interface Config extends Document<string>, Omit<ShopConfig, '_id'> {
  _id: string;
}

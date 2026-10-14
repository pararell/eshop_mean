import { Document } from 'mongoose';
import type { Page as PageData } from '@eshop/shared';

export interface Page extends Document<string>, Omit<PageData, '_id'> {
  _id: string;
}

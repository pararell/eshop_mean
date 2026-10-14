import { Document } from 'mongoose';
import type { Theme as ThemeData } from '@eshop/shared';

export interface Theme extends Document<string>, Omit<ThemeData, '_id'> {
  _id: string;
}

import { Document } from 'mongoose';

export interface Translation extends Document {
  lang: string;
  keys: any;
}

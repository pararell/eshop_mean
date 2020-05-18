import { Document } from 'mongoose';

export interface Translation extends Document {
  lang: String;
  keys: any;
}

import { Document } from 'mongoose';

export interface Page extends Document<string> {
  _id: string;
  titleUrl: string;
  dateAdded?: Date;
  [lang: string]: { title: string; contentHTML: string } | any;
}

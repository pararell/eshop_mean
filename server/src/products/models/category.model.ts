import { Document } from 'mongoose';

export interface Category {
  titleUrl: string;
  mainImage : {url: string; name: string};
  _user? : any;
  dateAdded: any;
  [lang: string] : any | {
    title: string;
    description: string;
    visibility: Boolean;
  }
}

export interface CategoryModel extends Category, Document {
}


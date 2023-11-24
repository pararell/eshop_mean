import { languages } from './constants';

export interface Translations {
  lang: string;
  keys: {
    [key: string]: string;
  }
  _id?: string;
}

export interface Product {
  _id?                : string;
  title               : string;
  titleUrl            : string;
  description         : string;
  descriptionFull     : string[];
  tags                : string[];
  regularPrice        : number;
  salePrice           : number;
  visibility          : boolean;
  onSale              : boolean;
  stock               : string;
  shipping?           : string;
  mainImage           : { url: string; name: string }
  images              : string[];
  _user?              : any;
  dateAdded?          : any;
}

export interface Cart {
  totalQty    : number;
  totalPrice  : number;
  shippingCost?: number;
  shippingLimit?: number;
  shippingType?: string;
  items       : {
    id? : string;
    item: Product
    price: number;
    qty  : number;
  }[]
}

export interface Category {
  titleUrl      : string;
  title?        : string;
  description?  : string;
  visibility?   : boolean;
  mainImage?    : {url: string; name: string; type?: boolean};
  subCategories? : string[];
  position      : number;
  [lang: string]: any | { title?: string; description?: string; visibility? : boolean; };
}

export interface Pagination {
  total     : number;
  limit?    : number;
  page      : number;
  pages     : number;
  range?    : number[]
}

export interface User {
  email       : string;
  id?         : string;
  roles?      : string[];
  accessToken?: string;
}

export interface Address {
  name: string;
  line1: string;
  line2: string;
  city: string;
  zip: string;
  country: string;
  region?: string;
}

export enum OrderStatus {
  NEW = 'NEW',
  PAID = 'PAID',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export interface Order {
  _id?: string;
  orderId: string;
  addresses: Address[]
  amount: number;
  amount_refunded: number;
  currency: string;
  cart: Cart;
  cardId?: string;
  customerEmail: string;
  dateAdded: any;
  type: string;
  description?: string;
  notes? : string;
  outcome?: {seller_message: string; }
  status: OrderStatus;
  __v?: number;
  _user?: string;
}

export interface Page {
  _id?                : string;
  titleUrl            : string;
  dateAdded?          : Date;
  [lang: string]      : any | { title?: string; contentHTML?: string };
}

export interface Theme {
  _id?                : string;
  titleUrl            : string;
  dateAdded?          : Date;
  active              : boolean;
  styles: any | {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    mainBackground: string;
    freeShippingPromo: string;
    promoSlideBackground: string;
    promoSlideBackgroundPosition: string;
    promo: string;
    logo: string;
  };
}

export interface Config {
  _id?                : string;
  titleUrl            : string;
  dateAdded?          : Date;
  active              : boolean;
  [lang: string]      : any | {
    shippingCost: {
      basic: { cost: number; limit: number; },
      extended: { cost: number; limit: number; }
    }
  }
}

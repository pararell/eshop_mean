import { Document } from 'mongoose';
import { Cart } from '../../cart/utils/cart';

export enum OrderStatus {
  NEW = 'NEW',
  PAID = 'PAID',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}


export interface Address {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  zip: string;
  country: string;
  region?: string;
}


export interface Order extends Document {
    orderId: string;
    amount: number;
    amount_refunded?    : number;
    currency: string;
    cart: Cart;
    status: OrderStatus;
    customerEmail: string;
    addresses: Address[];
    notes?              : string;
    type?               : string;
    description?        : string;
    outcome?            : {seller_message: string };
    dateAdded: any;
    cardId?             : string;
    _user?              : any;
}

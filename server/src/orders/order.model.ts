import { Document } from "mongoose";

export interface Order extends Document {
    orderId             : string;
    amount              : number;
    amount_refunded?    : number;
    description         : string;
    customerEmail       : string;
    status              : string;
    cart                : any;
    outcome?            : any;
    source?             : any;
    addresses?          : any;
    _user               : any;
    dateAdded           : Date;
}
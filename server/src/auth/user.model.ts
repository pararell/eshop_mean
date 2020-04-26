import { Document } from "mongoose";
import { Product } from "../products/models/product.model";

export interface User extends Document {
    _id                 : string;
    email               : string;
    password?           : string;
    name?               : string;
    salt?               : string;
    cart?               : { items: Product[], totalQty: number; totalPrice: number };
    images?             : string[];
    roles?              : string[];
    googleId?           : string;
}
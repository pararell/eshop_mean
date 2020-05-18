import { Document } from 'mongoose';
import { CartModel } from '../../cart/models/cart.model';

export interface User extends Document {
    _id: string;
    email: string;
    password?           : string;
    name?               : string;
    salt?               : string;
    cart?               : CartModel;
    images?             : string[];
    roles?              : string[];
    googleId?           : string;
}

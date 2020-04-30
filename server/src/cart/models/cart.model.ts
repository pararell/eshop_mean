import { Product } from '../../products/models/product.model';

export interface Cart {
    totalQty    : number;
    totalPrice  : number;
    items       : Product[]
}

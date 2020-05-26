import { Product } from '../../products/models/product.model';

export interface CartModel {
    totalQty?   : number;
    totalPrice? : number;
    shippingCost?: number;
    shippingType?: string;
    items: Product[];
}

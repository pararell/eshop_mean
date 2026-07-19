export interface CartModel {
  totalQty?: number;
  totalPrice?: number;
  shippingCost?: number;
  shippingLimit?: number;
  shippingType?: string;
  items: any[];
}
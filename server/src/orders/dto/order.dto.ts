import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { Cart } from '../../cart/utils/cart';

export interface Address {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  zip: string;
  country: string;
  region?: string;
}

export class OrderDto {
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  email: string;

  addresses: Address[];
  cart: Cart;
  userId?: string;
  notes?: string;
  cardId?: string;

  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  currency: string;
}
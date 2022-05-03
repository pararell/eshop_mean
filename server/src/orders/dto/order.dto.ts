import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { Cart } from '../../cart/utils/cart';
import { Address } from '../models/order.model';

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

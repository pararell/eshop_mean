import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class OrderDto {
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  email: string;

  addresses : Address[];
  cart      : any;
  userId?   : string;
  notes?    : string;
  cardId?   : string;

  @IsNotEmpty()
  amount    : number;

  @IsNotEmpty()
  currency  : string;
}

export interface Address {
    name?       : string;
    city        : string;
    country     : string;
    line1       : string;
    line2?      : string;
    zip         : string;
}

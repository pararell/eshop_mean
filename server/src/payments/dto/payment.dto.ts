import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  zip!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  region?: string;
}

/** Body of POST /api/payments/intent; amount and currency are never taken from the client */
export class PaymentIntentDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses!: AddressDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class PaymentCompleteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  orderId!: string;
}

export class RefundDto {
  /** Major units; omitted = refund what is left */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;
}

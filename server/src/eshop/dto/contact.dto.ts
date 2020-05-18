import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class ContactDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  email: string;

  name: string;

  @IsNotEmpty()
  @IsString()
  notes: string;

  @IsNotEmpty()
  @IsString()
  token: string;
}

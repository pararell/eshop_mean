import { IsNotEmpty } from 'class-validator';

export class GetCartChangeDto {
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  lang: string;
}

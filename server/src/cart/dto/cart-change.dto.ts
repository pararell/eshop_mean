import { IsNotEmpty } from 'class-validator';

export class GetCartChangeDto {
  @IsNotEmpty()
  id: string;

  lang?: string;
}

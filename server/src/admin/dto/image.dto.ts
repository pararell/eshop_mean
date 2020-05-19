import { IsString, IsNotEmpty } from 'class-validator';

export class ImageDto {
  @IsNotEmpty()
  @IsString()
  image: string;
}

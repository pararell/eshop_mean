import { IsString, IsNotEmpty } from 'class-validator';

export class PageDto {
  @IsNotEmpty()
  @IsString()
  titleUrl: string;

  [lang: string]: any | { title: string; contentHTML: string };
}

import { IsString, IsNotEmpty } from 'class-validator';

export class PageDto {
  @IsNotEmpty()
  @IsString()
  titleUrl!: string;

  /** Per-language content: `en: { title, contentHTML }`, ... */
  [lang: string]: unknown;
}

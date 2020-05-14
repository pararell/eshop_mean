import { IsString, IsNotEmpty } from 'class-validator';

export class PageDto {
    @IsNotEmpty()
    @IsString()
    titleUrl: string;

    en?  : {title: string; contentHTML: string};
    sk?  : {title: string; contentHTML: string};
    cs?  : {title: string; contentHTML: string};
  }

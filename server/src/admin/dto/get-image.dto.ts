import { IsString } from 'class-validator';

export class GetImageDto {
    @IsString()
    titleUrl: string;
  }
  
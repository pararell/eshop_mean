import { IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { SortOptions } from '../models/sort.enum';

export class GetProductsDto {
  @IsNotEmpty()
  lang!: string;

  @IsNotEmpty()
  page!: string;

  @IsIn([SortOptions.newest, SortOptions.oldest, SortOptions.priceasc, SortOptions.pricedesc])
  sort!: SortOptions;

  category?: string;

  search?: string;

  maxPrice?: number;

  /** 'true': only products on sale (home product rows) */
  @IsOptional()
  @IsIn(['true', 'false'])
  onSale?: string;
}

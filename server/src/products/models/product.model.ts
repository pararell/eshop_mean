import { Document, FilterQuery, Model } from 'mongoose';
import type { LocalizedProduct, ProductRaw, ProductsPage } from '@eshop/shared';

export type { LocalizedProduct, ProductsPage };

/** Product document: language-independent fields plus one sub-document per language. */
export interface Product extends Document<string>, Omit<ProductRaw, '_id'> {
  _id: string;
}

export interface PaginateOptions {
  sort: string;
  price: 'salePrice';
  page: number;
  limit: number;
  lang: string;
}

export interface PaginateResult {
  all: Product[];
  pagination: ProductsPage['pagination'];
  maxPrice: number;
  minPrice: number;
}

export interface ProductModel extends Model<Product> {
  paginate(query: FilterQuery<Product>, options: PaginateOptions): Promise<PaginateResult>;
}

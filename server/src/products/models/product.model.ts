import { Document, Model, DocumentQuery } from 'mongoose';

export interface Product extends Document {
    _id: string;
    title: string;
    description: string;
    descriptionFull: any;
    categories: string[];
    tags: string[];
    regularPrice: number;
    salePrice: number;
    titleUrl: string;
    onSale: boolean;
    stock: string;
    visibility: boolean;
    shipping?           : string;
    mainImage: { url: string; name: string };
    images: string[];
    _user: any;
    dateAdded?          : Date;
}

export interface PaginateOptions {
  sort: string;
  price: string;
  page: number;
  limit: number;
  lang: string;
}

export interface ProductModel extends Model<Product> {
    paginate(query: any, options: PaginateOptions): DocumentQuery<ProductsWithPagination, Product>;
}

export interface ProductsWithPagination {
    all: Product[];
    total: number;
    limit: number;
    page: number;
    pages: number;
}

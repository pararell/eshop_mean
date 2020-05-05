export interface Translations {
  lang: string;
  keys: {
    [key: string]: string;
  }
  _id?: string;
}

export interface Product {
  _id?                : string;
  title               : string;
  titleUrl            : string;
  description         : string;
  descriptionFull     : string;
  categories          : string[];
  tags                : string[];
  regularPrice        : number;
  salePrice           : number;
  visibility          : boolean;
  onSale              : boolean;
  stock               : string;
  shipping?           : string;
  mainImage           : { url: string; name: string }
  images              : string[];
  _user?              : any;
  dateAdded?          : Date;
}

export interface Cart {
  totalQty    : number;
  totalPrice  : number;
  items       : Product[]
}

export interface Category {
  title     : string;
  titleUrl  : string;
}

export interface Pagination {
  total     : number;
  limit     : number;
  page      : number;
  pages     : number;
  range?    : number[]
}

export interface User {
  email     : string;
  id?       : string;
  roles     : string[];
}

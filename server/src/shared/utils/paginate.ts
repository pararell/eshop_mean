import { FilterQuery, Schema } from 'mongoose';
import type { PaginateOptions, PaginateResult, Product, ProductModel } from '../../products/models/product.model';

/** Product document with only `<lang>.salePrice` selected */
type PriceDoc = Record<string, Record<string, number>> | null;

function paginateSchema(this: ProductModel, query: FilterQuery<Product>, options: PaginateOptions): Promise<PaginateResult> {
  query = query || {};
  options = Object.assign({}, options);

  const sort = options.sort;
  // eslint-disable-next-line no-prototype-builtins
  const limit = options.hasOwnProperty('limit') ? options.limit : 10;
  const page = options.page || 1;
  // eslint-disable-next-line no-prototype-builtins
  const skip = options.hasOwnProperty('page') ? (page - 1) * limit : 0;
  const all = limit
    ? this.find(query).sort(sort).skip(skip).limit(limit).exec()
    : // Known bug (audit BUG-10): `query` is a plain filter object here, so this throws
      (query as unknown as { exec: () => Promise<Product[]> }).exec();
  const countDocuments = this.countDocuments(query).exec();
  const maxPrice = this.findOne({})
    .sort(`-${options.lang}.${options.price}`)
    .select(`${options.lang}.${options.price}`) as unknown as Promise<PriceDoc>;
  const minPrice = this.findOne({})
    .sort(`${options.lang}.${options.price}`)
    .select(`${options.lang}.${options.price}`) as unknown as Promise<PriceDoc>;

  return Promise.all([all, countDocuments, maxPrice, minPrice]).then(function (values) {
    return Promise.resolve({
      all: values[0],
      pagination: {
        total: values[1],
        limit: limit,
        page: page,
        pages: Math.ceil(values[1] / limit) || 1,
      },
      maxPrice: values[2] ? values[2][options.lang][options.price] : Infinity,
      minPrice: values[3] ? values[3][options.lang][options.price] : 0,
    });
  });
}

export const paginateFn = paginateSchema;

export const pagination = (schema: Schema): void => {
  (schema.statics as Record<string, unknown>).paginate = paginateSchema;
};

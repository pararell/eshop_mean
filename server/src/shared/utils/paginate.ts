import { PaginateOptions, Product } from '../../products/models/product.model';

function paginateSchema(query, options: PaginateOptions)
  : Promise<{all: Product[]; pagination; maxPrice: number; minPrice: number}> {
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
    : query.exec();
  const countDocuments = this.countDocuments(query).exec();
  const maxPrice = this.findOne({}).sort(`-${options.lang}.${options.price}`).select(`${options.lang}.${options.price}`)
  const minPrice = this.findOne({}).sort(`${options.lang}.${options.price}`).select(`${options.lang}.${options.price}`)

  return Promise.all([all, countDocuments, maxPrice, minPrice]).then(function (values) {
    return Promise.resolve({
      all: values[0],
      pagination: {
        total: values[1],
        limit: limit,
        page: page,
        pages: Math.ceil(values[1] / limit) || 1
      },
      maxPrice: values[2] ? values[2][options.lang][options.price] : Infinity,
      minPrice: values[3] ? values[3][options.lang][options.price] : 0,
    });
  });
}

export const paginateFn = paginateSchema;

export const pagination = (schema): void => {
  schema.statics.paginate = paginateSchema;
  const paginate = paginateFn;
};

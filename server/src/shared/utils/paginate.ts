function paginate(query, options) {
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

  return Promise.all([all, countDocuments]).then(function (values) {
    return Promise.resolve({
      all: values[0],
      total: values[1],
      limit: limit,
      page: page,
      pages: Math.ceil(values[1] / limit) || 1,
    });
  });
}

export const pagination = (schema): void => {
  schema.statics.paginate = paginate;
  this.paginate = paginate;
};

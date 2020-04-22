import * as mongoose from 'mongoose';
const { Schema } = mongoose;
import * as paginate from '../../shared/utils/paginate';

const getProductLangInfo = () => {
  return {
    title           : String,
    description     : String,
    descriptionFull : [],
    categories      : [],
    tags            : [],
    regularPrice    : Number,
    salePrice       : Number
  }
}

const ProductSchema = new Schema({
    titleUrl    : String,
    onSale      : Boolean,
    stock       : String,
    visibility  : String,
    shipping    : String,
    mainImage   : 
    {
      url : { type: String, trim: true },
      name: { type: String, trim: true }
    },
    images      : [],
    _user       : { type: Schema.Types.ObjectId, ref: 'user' },
    dateAdded   : Date,
    sk: getProductLangInfo(),
    cs: getProductLangInfo(),
    en: getProductLangInfo(),
});

ProductSchema.plugin(paginate.pagination);

export default ProductSchema;



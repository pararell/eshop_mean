import * as mongoose from 'mongoose';
const { Schema } = mongoose;

import { languages } from '../../shared/constans';

const getCategoryLangInfo = (): {[lang: string]: {}} => {
  return languages
    .reduce((prev, lang) => ({...prev,
      [lang]:
      { title: String,
        description: String,
        position: Number,
        visibility: Boolean
      }}),
    {})
}

const CategorySchema = new Schema({
  titleUrl: String,
  mainImage: {
    url: { type: String, trim: true },
    name: { type: String, trim: true },
    type: { type: Boolean }
  },
  _user: { type: Schema.Types.ObjectId, ref: 'user' },
  dateAdded: Date,
  ...getCategoryLangInfo()
});


export default CategorySchema;

import * as mongoose from 'mongoose';
const { Schema } = mongoose;

const TranslationSchema = new Schema({
  lang: String,
  keys: { type: Schema.Types.Mixed, default: {} },
});

export default TranslationSchema;

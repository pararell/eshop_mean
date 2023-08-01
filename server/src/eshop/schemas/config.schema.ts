import * as mongoose from 'mongoose';
const { Schema } = mongoose;
import { languages } from '../../shared/constans';

const getConfigLangContent = (): { [lang: string]: {} } => {
  return languages.reduce(
    (prev, lang) => ({
      ...prev,
      [lang]: {
        shippingCost: {
          basic: { cost: Number, limit: Number },
          extended: { cost: Number, limit: Number },
        },
      },
    }),
    {},
  );
};

const ConfigSchema = new Schema({
  titleUrl: String,
  dateAdded: Date,
  active: Boolean,
  ...getConfigLangContent(),
});

export default ConfigSchema;

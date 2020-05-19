import * as mongoose from 'mongoose';
const { Schema } = mongoose;
import { languages } from '../../shared/constans';

const getPageLangContent = (): {[lang: string]: {}} => {
  return languages
    .reduce((prev, lang) => ({...prev,
      [lang]: {title: String, contentHTML : String} }),
    {})
}

const PageSchema = new Schema({
    titleUrl    : String,
    dateAdded   : Date,
    ...getPageLangContent(),
});

export default PageSchema;

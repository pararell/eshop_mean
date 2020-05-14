import * as mongoose from 'mongoose';
const { Schema } = mongoose;

const getPageLangContent = () => {
  return {
    title: String,
    contentHTML : String
  }
}

const PageSchema = new Schema({
    titleUrl    : String,
    dateAdded   : Date,
    sk: getPageLangContent(),
    cs: getPageLangContent(),
    en: getPageLangContent(),
});

export default PageSchema;

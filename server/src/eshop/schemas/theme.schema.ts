import * as mongoose from 'mongoose';
const { Schema } = mongoose;

const ThemeSchema = new Schema({
  titleUrl: String,
  dateAdded: Date,
  active: Boolean,
  styles: {},
});

export default ThemeSchema;

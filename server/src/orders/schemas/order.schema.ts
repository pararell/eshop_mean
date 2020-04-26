import * as mongoose from 'mongoose';
const { Schema } = mongoose;

const OrderSchema = new Schema({
    orderId                 : String,
    cardId                  : String,
    amount                  : Number,
    amount_refunded         : Number,
    description             : String,
    customerEmail           : String,
    status                  : String,
    currency                : String,
    cart                    : {},
    outcome                 : {},
    source                  : {},
    addresses               : [],
    _user                   : { type: Schema.Types.ObjectId, ref: 'user' },
    dateAdded               : { type: Date, default: Date.now }
});

export default OrderSchema;

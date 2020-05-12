import * as mongoose from 'mongoose';
const { Schema } = mongoose;

const OrderSchema = new Schema({
    orderId                 : String,
    cardId                  : String,
    amount                  : Number,
    amount_refunded         : Number,
    currency                : String,
    status                  : String,
    notes                   : String,
    type                    : String,
    customerEmail           : String,
    cart                    : {},
    outcome                 : { seller_message: String },
    addresses               : [],
    dateAdded               : { type: Date, default: Date.now },
    _user                   : { type: Schema.Types.ObjectId, ref: 'user' },
});

export default OrderSchema;

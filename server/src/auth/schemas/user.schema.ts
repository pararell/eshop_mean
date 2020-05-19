import * as mongoose from 'mongoose';
const { Schema } = mongoose;

const UserSchema = new Schema({
    googleId        : String,
    email           : String,
    password        : String,
    name            : String,
    salt            : String,
    cart            : { type: Schema.Types.Mixed, default: {items: []} },
    images          : [],
    roles           : [],
});

export default UserSchema;

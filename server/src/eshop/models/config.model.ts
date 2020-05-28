import { Document } from 'mongoose';

export interface Config extends Document {
    _id: string;
    titleUrl: string;
    dateAdded? : Date;
    config: any;
}

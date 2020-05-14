import { Document } from 'mongoose';

export interface Page extends Document {
    _id                 : string;
    titleUrl            : string;
    dateAdded?          : Date;
    en?                 : {title: string; contentHTML: string};
    sk?                 : {title: string; contentHTML: string};
    cs?                 : {title: string; contentHTML: string};
}

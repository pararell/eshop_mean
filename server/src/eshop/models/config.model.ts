import { Document } from 'mongoose';

export interface Config extends Document {
    _id: string;
    titleUrl: string;
    dateAdded?: Date;
    active: boolean;
    [lang: string]: any | {
      shippingCost: {
        basic: { cost: number; limit: number; },
        extended: { cost: number; limit: number; }
      }
    }
}

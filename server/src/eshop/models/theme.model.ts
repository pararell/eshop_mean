import { Document } from 'mongoose';

export interface Theme extends Document {
    _id: string;
    titleUrl: string;
    dateAdded? : Date;
    active: boolean;
    styles: any | {
      primaryColor: string;
      secondaryColor: string;
      backgroundColor: string;
      mainBackground: string;
      freeShippingPromo: string;
      promoSlideBackground: string;
      promoSlideBackgroundPosition: string;
      promo: string;
      logo: string;
    };
}

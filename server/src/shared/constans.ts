import type { LanguageCode, ShippingCost, ShippingType } from '@eshop/shared';

export const languages: LanguageCode[] = ['en', 'sk', 'cs'];

export const countryLang: Record<string, string> = {
  default: 'en',
  en: 'en',
  sk: 'sk',
  cz: 'cs',
};

export const shippingTypes: ShippingType[] = ['basic', 'extended'];

/** Fallback shipping costs when no active shop config is in the session. */
export const shippingCost: Record<LanguageCode, ShippingCost> = {
  en: { basic: { cost: 5, limit: 100 }, extended: { cost: 10, limit: 200 } },
  sk: { basic: { cost: 5, limit: 100 }, extended: { cost: 10, limit: 200 } },
  cs: {
    basic: { cost: 150, limit: 3000 },
    extended: { cost: 300, limit: 6000 },
  },
};

export const paginationLimit = 12;

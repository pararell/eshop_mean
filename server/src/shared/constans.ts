export const languages = ['en', 'sk', 'cs'];

export const countryLang = {
  default: 'en',
  en: 'en',
  sk: 'sk',
  cz: 'cs',
};

export const shippingTypes = ['basic', 'extended'];

export const shippingCost = {
  en: { basic: { cost: 5, limit: 100 }, extended: { cost: 10, limit: 200 } },
  sk: { basic: { cost: 5, limit: 100 }, extended: { cost: 10, limit: 200 } },
  cs: { basic: { cost: 150, limit: 3000 }, extended: { cost: 300, limit: 6000 } },
};

export const paginationLimit = 12;

export const languages = ['en', 'sk', 'cs'];

export const countryLang = {
  default: 'en',
  'en' : 'en',
  'sk' : 'sk',
  'cz' : 'cs',
}

export const shippingTypes = ['basic', 'extended'];

export const shippingCost = {
  basic: {
    'en' : {cost: 5, limit: 100},
    'sk' : {cost: 5, limit: 100},
    'cs' : {cost: 150, limit: 3000},
  },
  extended: {
    'en' : {cost: 10, limit: 200},
    'sk' : {cost: 10, limit: 200},
    'cs' : {cost: 300, limit: 600},
  }
}

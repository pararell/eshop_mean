import { BadRequestException } from '@nestjs/common';

import { assertThemeStyles, themeStylesErrors } from './theme-styles';

describe('theme styles', () => {
  it('accepts the known settings, and empty strings to clear them', () => {
    expect(
      themeStylesErrors({
        primaryColor: '#15803d',
        shopName: 'Trail Shop',
        logo: 'https://res.cloudinary.com/x/logo.svg',
        heroTint: 'warm',
        promo: 'block',
        promoLink: '/en/product/category/tents',
        promoTitle_sk: 'Výpredaj',
        promoSlideVideo: '',
      }),
    ).toEqual([]);
  });

  it('rejects unknown keys, non-text values and invalid values', () => {
    expect(
      themeStylesErrors({
        fontFamily: 'Comic Sans',
        primaryColor: 'green',
        logo: 'http://example.com/logo.png',
        heroTint: 'cold',
        promoLink: '//evil.example',
        shopName: 42,
        promoTitle_de: 'Sale',
      }),
    ).toEqual([
      'fontFamily is not a theme setting',
      'primaryColor must be a hex color like #15803d',
      'logo must be an https URL',
      'heroTint must be one of none, warm',
      'promoLink must be a shop path (/en/…) or an https URL',
      'shopName must be text',
      'promoTitle_de is not a theme setting',
    ]);
    expect(() => assertThemeStyles([])).toThrow(BadRequestException);
  });
});

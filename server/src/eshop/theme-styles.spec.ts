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

  describe('home layout', () => {
    const band = {
      id: 'autumn',
      type: 'band',
      enabled: true,
      image: 'https://res.cloudinary.com/x/a.jpg',
      link: '/en/product/all',
      text: { en: { title: 'Sale' } },
    };

    it('accepts the sections in any order, the hero first, bands repeated', () => {
      const home = [
        { id: 'hero', type: 'hero', enabled: true },
        band,
        { id: 'products', type: 'products', enabled: true },
        { ...band, id: 'winter', enabled: false },
        { id: 'categories', type: 'categories', enabled: true },
        { id: 'benefits', type: 'benefits', enabled: false },
      ];
      expect(themeStylesErrors({ home })).toEqual([]);
    });

    it('rejects a misplaced hero, repeated single sections, duplicate ids and bad fields', () => {
      const home = [
        { id: 'products', type: 'products', enabled: true },
        { id: 'hero', type: 'hero', enabled: true },
        { id: 'products', type: 'products', enabled: 'yes' },
        { id: 'x', type: 'carousel', enabled: true },
        { id: 'band', type: 'band', enabled: true, image: 'http://x/a.jpg', color: 'red', text: { de: { title: 'x' }, en: { title: 1 } } },
      ];
      expect(themeStylesErrors({ home })).toEqual([
        'home[1]: the hero can only be the first section',
        'home[2].id products is used twice',
        'home[2].enabled must be true or false',
        'home[2]: only one products section',
        'home[3].type must be one of hero, benefits, categories, products, band, trips, productRow',
        'home[4].image must be an https URL',
        'home[4].color is not a band setting',
        'home[4].text.de is not a language',
        'home[4].text.en.title must be text',
      ]);
      expect(themeStylesErrors({ home: 'hero' })).toEqual(['home must be a list of sections']);
    });

    it('accepts full-width bands with a button, trips, product rows and ridge dividers', () => {
      const home = [
        { ...band, width: 'full', divider: 'ridge', text: { en: { title: 'Sale', button: 'See the tents' } } },
        { id: 'trips', type: 'trips', enabled: true, categories: ['day_hike', 'túry'], text: { sk: { title: 'Podľa túry' } } },
        { id: 'sale', type: 'productRow', enabled: true, source: 'sale', divider: 'none' },
        { id: 'tents', type: 'productRow', enabled: true, source: 'category', category: 'tents', text: { en: { title: 'Tents' } } },
      ];
      expect(themeStylesErrors({ home })).toEqual([]);
    });

    it('rejects bad trips and product rows', () => {
      const home = [
        { id: 'trips', type: 'trips', enabled: true, categories: ['a', 'b', 'c', 'd'] },
        { id: 'trips-2', type: 'trips', enabled: true, categories: ['a', 'a'], text: { en: { title: 'x', text: 'no' } } },
        { id: 'trips-3', type: 'trips', enabled: true },
        { id: 'row', type: 'productRow', enabled: true, source: 'category' },
        { id: 'row-2', type: 'productRow', enabled: true, source: 'random', category: 'a/b', image: 'https://x/a.jpg' },
        { id: 'row-3', type: 'productRow', enabled: true, divider: 'wave' },
        { ...band, id: 'b', width: 'wide', text: { en: { title: 'x', button: 'x'.repeat(41) } } },
      ];
      expect(themeStylesErrors({ home })).toEqual([
        'home[0].categories must be a list of 1 to 3 categories',
        'home[1].categories has a category twice',
        'home[1].text.en.text is not a text field',
        'home[2].categories is required',
        'home[3].category is required for the category source',
        'home[4].source must be one of newest, sale, category',
        'home[4].category must be a category URL name',
        'home[4].image is not a productRow setting',
        'home[5].divider must be one of none, ridge',
        'home[5].source is required',
        'home[6].text.en.button must be at most 40 characters',
        'home[6].width must be one of boxed, full',
      ]);
    });
  });
});

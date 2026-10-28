// The client has no unit-test runner; pure client functions are tested here with the server's Jest
import type { HomeSection } from '@eshop/shared';

import { bandView, defaultHomeSections, editableHomeSections, newBand, visibleHomeSections } from '../../../client/src/app/shared/home-layout';

describe('home layout', () => {
  it('without `home`, keeps the page as before: hero, benefits, categories, products, promo banner', () => {
    expect(visibleHomeSections({}).map((s) => s.type)).toEqual(['hero', 'benefits', 'categories', 'products']);
    const withPromo = { promo: 'block', promoImage: 'https://x/a.jpg', promoLink: '/en/product/all', promoTitle_sk: 'Výpredaj' } as const;
    const sections = visibleHomeSections(withPromo);
    expect(sections.map((s) => s.type)).toEqual(['hero', 'benefits', 'categories', 'products', 'band']);
    expect(defaultHomeSections(withPromo)[4]).toMatchObject({
      image: 'https://x/a.jpg',
      link: '/en/product/all',
      text: { sk: { title: 'Výpredaj', text: '' } },
    });
  });

  it('follows the theme order and leaves disabled sections out', () => {
    const home: HomeSection[] = [
      { id: 'products', type: 'products', enabled: true },
      { id: 'benefits', type: 'benefits', enabled: false },
      { id: 'categories', type: 'categories', enabled: true },
    ];
    expect(visibleHomeSections({ home }).map((s) => s.id)).toEqual(['products', 'categories']);
  });

  it('shows a band only in the languages that have a title', () => {
    const band = { id: 'b', type: 'band', enabled: true, link: '//evil.example', text: { en: { title: ' Sale ', text: 'Tents' } } } as const;
    expect(bandView({ ...band, text: { ...band.text } }, 'en')).toEqual({
      title: 'Sale',
      text: 'Tents',
      image: '',
      link: '//evil.example',
      internal: false,
    });
    expect(bandView({ ...band, text: { ...band.text } }, 'sk')).toBeNull();
  });

  describe('editor', () => {
    it('lists the hero first and every single section once, adding the missing ones switched off', () => {
      const home: HomeSection[] = [
        { id: 'products', type: 'products', enabled: true },
        { id: 'hero', type: 'hero', enabled: false },
        { id: 'band', type: 'band', enabled: true, text: { en: { title: 'Sale' } } },
      ];
      expect(editableHomeSections({ home }).map((s) => [s.id, s.enabled])).toEqual([
        ['hero', false],
        ['products', true],
        ['band', true],
        ['benefits', false],
        ['categories', false],
      ]);
    });

    it('opens a theme without `home` as the default layout, the promo banner as a band', () => {
      expect(editableHomeSections({ promo: 'none' }).map((s) => s.id)).toEqual(['hero', 'benefits', 'categories', 'products', 'promo']);
    });

    it('gives a new band a free id and empty texts in every language', () => {
      const band = newBand([...editableHomeSections({}), { id: 'band', type: 'band', enabled: true, text: {} }]);
      expect(band).toEqual({
        id: 'band-2',
        type: 'band',
        enabled: true,
        image: '',
        link: '',
        text: { en: { title: '', text: '' }, sk: { title: '', text: '' }, cs: { title: '', text: '' } },
      });
    });
  });
});

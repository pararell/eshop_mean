// The client has no unit-test runner; pure client functions are tested here with the server's Jest
import type { HomeSection } from '@eshop/shared';

import { bandView, defaultHomeSections, visibleHomeSections } from '../../../client/src/app/shared/home-layout';

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
});

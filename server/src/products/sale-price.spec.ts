import { BadRequestException } from '@nestjs/common';

import { assertSalePrices, invalidSalePrices } from './sale-price';

describe('sale price rule', () => {
  it('accepts a sale price below the regular price', () => {
    expect(invalidSalePrices({ en: { onSale: true, salePrice: 80, regularPrice: 100 } })).toEqual([]);
  });

  it('rejects an equal or higher sale price, per language', () => {
    const input = { en: { onSale: true, salePrice: 100, regularPrice: 100 }, sk: { onSale: 'true', salePrice: '120', regularPrice: '100' } };
    expect(invalidSalePrices(input)).toEqual(['en', 'sk']);
    expect(() => assertSalePrices(input)).toThrow(BadRequestException);
  });

  it('ignores products not on sale and missing prices', () => {
    expect(
      invalidSalePrices({
        en: { onSale: false, salePrice: 120, regularPrice: 100 },
        sk: { onSale: true, salePrice: 120, regularPrice: null },
        cs: { onSale: true, salePrice: '', regularPrice: 100 },
      }),
    ).toEqual([]);
  });
});

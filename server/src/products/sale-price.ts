import { BadRequestException } from '@nestjs/common';

import { languages } from '../shared/constans';
import { toBool, toNumberOrNull } from '../db/mappers';

/**
 * Languages whose sale price is not below the regular price while "on sale". `salePrice` is the price
 * customers pay, so the rule only applies when the product is marked on sale and both prices are given.
 */
export function invalidSalePrices(input: Record<string, unknown>): string[] {
  return languages.filter((lang) => {
    const info = input[lang] as Record<string, unknown> | undefined;
    if (!info || !toBool(info.onSale)) return false;
    const sale = toNumberOrNull(info.salePrice);
    const regular = toNumberOrNull(info.regularPrice);
    return sale !== null && regular !== null && sale >= regular;
  });
}

/** 400 when a product on sale isn't cheaper than its regular price (admin add/edit) */
export function assertSalePrices(input: object): void {
  const invalid = invalidSalePrices(input as Record<string, unknown>);
  if (invalid.length) {
    throw new BadRequestException(`The sale price must be lower than the regular price (${invalid.join(', ')})`);
  }
}

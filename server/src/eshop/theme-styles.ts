import { BadRequestException } from '@nestjs/common';
import type { ThemeStyles } from '@eshop/shared';

import { languages } from '../shared/constans';

type Rule = { test: (value: string) => boolean; expected: string };

const color: Rule = { test: (v) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v), expected: 'a hex color like #15803d' };
const isHttps = (v: string): boolean => {
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
};
const httpsUrl: Rule = { test: isHttps, expected: 'an https URL' };
const oneOf = (...values: string[]): Rule => ({ test: (v) => values.includes(v), expected: `one of ${values.join(', ')}` });
const maxLength = (max: number): Rule => ({ test: (v) => v.length <= max, expected: `at most ${max} characters` });
const shopPathOrHttps: Rule = {
  test: (v) => (v.startsWith('/') && !v.startsWith('//')) || isHttps(v),
  expected: 'a shop path (/en/…) or an https URL',
};

/** Every key a theme may store (shared ThemeStyles); an empty string always clears a value */
const RULES: Record<string, Rule> = {
  primaryColor: color,
  logo: httpsUrl,
  shopName: maxLength(60),
  promoSlideBackground: httpsUrl,
  promoSlideVideo: httpsUrl,
  promoSlideBackgroundPosition: oneOf('center', 'top', 'bottom'),
  heroTint: oneOf('none', 'warm'),
  promo: oneOf('none', 'block'),
  promoImage: httpsUrl,
  promoLink: shopPathOrHttps,
  ...Object.fromEntries(
    languages.flatMap((lang) => [[`promoTitle_${lang}`, maxLength(120)] as const, [`promoText_${lang}`, maxLength(300)] as const]),
  ),
  // Deprecated: no longer edited or used, but stored themes still carry them
  secondaryColor: color,
  backgroundColor: color,
  mainBackground: httpsUrl,
  freeShippingPromo: oneOf('none', 'block'),
};

/** What is wrong with a theme's styles, as readable lines; [] when valid */
export function themeStylesErrors(styles: unknown): string[] {
  if (styles === null || typeof styles !== 'object' || Array.isArray(styles)) return ['styles must be an object'];
  return Object.entries(styles).flatMap(([key, value]) => {
    const rule = RULES[key];
    if (!rule) return [`${key} is not a theme setting`];
    if (typeof value !== 'string') return [`${key} must be text`];
    return value === '' || rule.test(value) ? [] : [`${key} must be ${rule.expected}`];
  });
}

/** 400 with every problem when a theme's styles are invalid (admin save) */
export function assertThemeStyles(styles: unknown): ThemeStyles {
  const errors = themeStylesErrors(styles);
  if (errors.length) throw new BadRequestException(errors);
  return styles as ThemeStyles;
}

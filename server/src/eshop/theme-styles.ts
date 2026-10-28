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

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

const SECTION_TYPES = ['hero', 'benefits', 'categories', 'products', 'band'];
/** Fields each section type may have, besides id, type and enabled */
const SECTION_FIELDS: Record<string, string[]> = { band: ['image', 'link', 'text'] };
/** Types that may appear only once (one list of products and categories on the page) */
const SINGLE_TYPES = ['hero', 'benefits', 'categories', 'products'];
const MAX_SECTIONS = 20;

/** Problems with the home layout (`styles.home`), as readable lines */
function homeErrors(home: unknown): string[] {
  if (!Array.isArray(home)) return ['home must be a list of sections'];
  if (home.length > MAX_SECTIONS) return [`home has at most ${MAX_SECTIONS} sections`];
  const errors: string[] = [];
  const ids = new Set<string>();
  home.forEach((section: unknown, index) => {
    const at = `home[${index}]`;
    if (!isObject(section)) return errors.push(`${at} must be an object`);
    const { id, type, enabled, ...rest } = section;
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(id)) errors.push(`${at}.id must be 1-40 lowercase letters, digits or -`);
    else if (ids.has(id)) errors.push(`${at}.id ${id} is used twice`);
    else ids.add(id);
    if (typeof type !== 'string' || !SECTION_TYPES.includes(type)) return errors.push(`${at}.type must be one of ${SECTION_TYPES.join(', ')}`);
    if (typeof enabled !== 'boolean') errors.push(`${at}.enabled must be true or false`);
    if (type === 'hero' && index !== 0) errors.push(`${at}: the hero can only be the first section`);
    if (SINGLE_TYPES.includes(type) && home.findIndex((other: unknown) => isObject(other) && other.type === type) !== index) {
      errors.push(`${at}: only one ${type} section`);
    }
    for (const [field, value] of Object.entries(rest)) {
      if (!(SECTION_FIELDS[type] ?? []).includes(field)) errors.push(`${at}.${field} is not a ${type} setting`);
      else if (field === 'text') errors.push(...bandTextErrors(value, `${at}.text`));
      else {
        const rule = field === 'image' ? httpsUrl : shopPathOrHttps;
        if (typeof value !== 'string') errors.push(`${at}.${field} must be text`);
        else if (value !== '' && !rule.test(value)) errors.push(`${at}.${field} must be ${rule.expected}`);
      }
    }
    if (type === 'band' && !('text' in rest)) errors.push(`${at}.text is required`);
  });
  return errors;
}

/** A band's texts: { en: { title, text? }, … } */
function bandTextErrors(text: unknown, at: string): string[] {
  if (!isObject(text)) return [`${at} must be an object`];
  return Object.entries(text).flatMap(([lang, value]) => {
    if (!(languages as string[]).includes(lang)) return [`${at}.${lang} is not a language`];
    if (!isObject(value)) return [`${at}.${lang} must be an object`];
    return Object.entries(value).flatMap(([field, fieldValue]) => {
      const max = { title: 120, text: 300 }[field];
      if (!max) return [`${at}.${lang}.${field} is not a text field`];
      if (typeof fieldValue !== 'string') return [`${at}.${lang}.${field} must be text`];
      return fieldValue.length > max ? [`${at}.${lang}.${field} must be at most ${max} characters`] : [];
    });
  });
}

/** What is wrong with a theme's styles, as readable lines; [] when valid */
export function themeStylesErrors(styles: unknown): string[] {
  if (!isObject(styles)) return ['styles must be an object'];
  return Object.entries(styles).flatMap(([key, value]) => {
    if (key === 'home') return homeErrors(value);
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

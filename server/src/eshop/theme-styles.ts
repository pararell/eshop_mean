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

const SECTION_TYPES = ['hero', 'benefits', 'categories', 'products', 'band', 'trips', 'productRow'];
/** Types that may appear only once (one list of products and categories on the page) */
const SINGLE_TYPES = ['hero', 'benefits', 'categories', 'products'];
const MAX_SECTIONS = 20;
const MAX_TRIPS = 3;
/** A category's titleUrl (tag slug) */
const categorySlug: Rule = { test: (v) => /^[^\s/?#]{1,100}$/u.test(v), expected: 'a category URL name' };
/** Settings each section type may have, besides id, type and enabled (every type may have `divider`) */
const SECTION_FIELDS: Record<string, Record<string, Rule>> = {
  band: { image: httpsUrl, link: shopPathOrHttps, width: oneOf('boxed', 'full') },
  trips: {},
  productRow: { source: oneOf('newest', 'sale', 'category'), category: categorySlug },
};
/** The texts per language each type may have, with their maximum length */
const SECTION_TEXTS: Record<string, Record<string, number>> = {
  band: { title: 120, text: 300, button: 40 },
  trips: { title: 120 },
  productRow: { title: 120 },
};

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
    const rules: Record<string, Rule> = { divider: oneOf('none', 'ridge'), ...SECTION_FIELDS[type] };
    for (const [field, value] of Object.entries(rest)) {
      if (field === 'text' && SECTION_TEXTS[type]) errors.push(...sectionTextErrors(value, SECTION_TEXTS[type], `${at}.text`));
      else if (field === 'categories' && type === 'trips') errors.push(...tripCategoriesErrors(value, `${at}.categories`));
      else if (!rules[field]) errors.push(`${at}.${field} is not a ${type} setting`);
      else if (typeof value !== 'string') errors.push(`${at}.${field} must be text`);
      else if (value !== '' && !rules[field].test(value)) errors.push(`${at}.${field} must be ${rules[field].expected}`);
    }
    if (type === 'band' && !('text' in rest)) errors.push(`${at}.text is required`);
    if (type === 'trips' && !('categories' in rest)) errors.push(`${at}.categories is required`);
    if (type === 'productRow' && !rest['source']) errors.push(`${at}.source is required`);
    if (type === 'productRow' && rest['source'] === 'category' && !rest['category'])
      errors.push(`${at}.category is required for the category source`);
  });
  return errors;
}

/** A section's texts: { en: { title, … }, … } */
function sectionTextErrors(text: unknown, fields: Record<string, number>, at: string): string[] {
  if (!isObject(text)) return [`${at} must be an object`];
  return Object.entries(text).flatMap(([lang, value]) => {
    if (!(languages as string[]).includes(lang)) return [`${at}.${lang} is not a language`];
    if (!isObject(value)) return [`${at}.${lang} must be an object`];
    return Object.entries(value).flatMap(([field, fieldValue]) => {
      const max = fields[field];
      if (!max) return [`${at}.${lang}.${field} is not a text field`];
      if (typeof fieldValue !== 'string') return [`${at}.${lang}.${field} must be text`];
      return fieldValue.length > max ? [`${at}.${lang}.${field} must be at most ${max} characters`] : [];
    });
  });
}

/** The categories of a trips section: 1 to 3 different category URL names */
function tripCategoriesErrors(value: unknown, at: string): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_TRIPS) return [`${at} must be a list of 1 to ${MAX_TRIPS} categories`];
  if (!value.every((slug) => typeof slug === 'string' && categorySlug.test(slug))) return [`${at} must hold category URL names`];
  return new Set(value).size === value.length ? [] : [`${at} has a category twice`];
}

const MAX_TILES = 12;
const TILE_EVERY = { min: 2, max: 24 };
/** A listing page: '*' (All products) or a category URL name */
const listingPage: Rule = { test: (v) => v === '*' || categorySlug.test(v), expected: "'*' or a category URL name" };
const TILE_TEXTS = { title: 120, text: 300, button: 40 };
const HEADER_TEXTS = { title: 120, text: 300 };

/** Problems with the product listing settings (`styles.listing`) */
function listingErrors(listing: unknown): string[] {
  if (!isObject(listing)) return ['listing must be an object'];
  const errors: string[] = [];
  for (const [key, value] of Object.entries(listing)) {
    if (key === 'header') errors.push(...listingHeaderErrors(value));
    else if (key === 'tileEvery') {
      if (!Number.isInteger(value) || (value as number) < TILE_EVERY.min || (value as number) > TILE_EVERY.max)
        errors.push(`listing.tileEvery must be a whole number from ${TILE_EVERY.min} to ${TILE_EVERY.max}`);
    } else if (key === 'tiles') errors.push(...listingTilesErrors(value));
    else if (key === 'featured') errors.push(...listingFeaturedErrors(value));
    else errors.push(`listing.${key} is not a listing setting`);
  }
  return errors;
}

function listingHeaderErrors(header: unknown): string[] {
  const at = 'listing.header';
  if (!isObject(header)) return [`${at} must be an object`];
  return Object.entries(header).flatMap(([field, value]) => {
    if (field === 'text') return sectionTextErrors(value, HEADER_TEXTS, `${at}.text`);
    if (field !== 'image') return [`${at}.${field} is not a header setting`];
    return typeof value === 'string' && (value === '' || httpsUrl.test(value)) ? [] : [`${at}.image must be ${httpsUrl.expected}`];
  });
}

function listingTilesErrors(tiles: unknown): string[] {
  if (!Array.isArray(tiles)) return ['listing.tiles must be a list'];
  if (tiles.length > MAX_TILES) return [`listing.tiles has at most ${MAX_TILES} tiles`];
  const ids = new Set<string>();
  return tiles.flatMap((tile: unknown, index) => {
    const at = `listing.tiles[${index}]`;
    if (!isObject(tile)) return [`${at} must be an object`];
    const errors: string[] = [];
    const { id, image, link, pages, text, ...rest } = tile;
    if (typeof id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(id)) errors.push(`${at}.id must be 1-40 lowercase letters, digits or -`);
    else if (ids.has(id)) errors.push(`${at}.id ${id} is used twice`);
    else ids.add(id);
    if (typeof image !== 'string' || !httpsUrl.test(image)) errors.push(`${at}.image must be ${httpsUrl.expected}`);
    if (typeof link !== 'string' || !shopPathOrHttps.test(link)) errors.push(`${at}.link must be ${shopPathOrHttps.expected}`);
    if (!Array.isArray(pages) || !pages.every((page) => typeof page === 'string' && listingPage.test(page)))
      errors.push(`${at}.pages must be a list of '*' or category URL names`);
    errors.push(...sectionTextErrors(text, TILE_TEXTS, `${at}.text`));
    errors.push(...Object.keys(rest).map((field) => `${at}.${field} is not a tile setting`));
    return errors;
  });
}

function listingFeaturedErrors(featured: unknown): string[] {
  if (!Array.isArray(featured)) return ['listing.featured must be a list'];
  const pages = new Set<string>();
  return featured.flatMap((entry: unknown, index) => {
    const at = `listing.featured[${index}]`;
    if (!isObject(entry)) return [`${at} must be an object`];
    const errors: string[] = [];
    const { page, source, product, ...rest } = entry;
    if (typeof page !== 'string' || !listingPage.test(page)) errors.push(`${at}.page must be ${listingPage.expected}`);
    else if (pages.has(page)) errors.push(`${at}: page ${page} has a featured product twice`);
    else pages.add(page);
    if (source !== 'product' && source !== 'sale') errors.push(`${at}.source must be one of product, sale`);
    if (product !== undefined && (typeof product !== 'string' || (product !== '' && !categorySlug.test(product))))
      errors.push(`${at}.product must be a product URL name`);
    if (source === 'product' && !product) errors.push(`${at}.product is required for the product source`);
    errors.push(...Object.keys(rest).map((field) => `${at}.${field} is not a featured setting`));
    return errors;
  });
}

/** What is wrong with a theme's styles, as readable lines; [] when valid */
export function themeStylesErrors(styles: unknown): string[] {
  if (!isObject(styles)) return ['styles must be an object'];
  return Object.entries(styles).flatMap(([key, value]) => {
    if (key === 'home') return homeErrors(value);
    if (key === 'listing') return listingErrors(value);
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

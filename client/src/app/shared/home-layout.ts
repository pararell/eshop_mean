// The home page as an ordered list of sections (ThemeStyles.home). Pure functions: no Angular, so
// they are tested with the server's Jest (server/test/client/home-layout.spec.ts).
import type { HomeSection, HomeSectionType, LanguageCode, ThemeStyles } from '@eshop/shared';

import { languages } from './constants';

type BandSection = Extract<HomeSection, { type: 'band' }>;
type TripsSection = Extract<HomeSection, { type: 'trips' }>;

/** What the trips section needs of a category (the storefront's localized categories) */
export interface TripCategory {
  titleUrl: string;
  title: string;
  description?: string;
  mainImage?: { url?: string };
}

/** What a band shows in one language */
export interface BandView {
  title: string;
  text: string;
  image: string;
  link: string;
  /** Shop paths navigate in the app; anything else is an ordinary link */
  internal: boolean;
  /** The button label; empty = the Shop_now translation */
  button: string;
  /** Edge to edge with a parallax photo; otherwise a rounded banner */
  full: boolean;
}

/** The trips section in one language: its title and the cards of the categories that exist */
export interface TripsView {
  title: string;
  cards: { titleUrl: string; title: string; description: string; image: string }[];
}

/**
 * The layout of a theme without `home`: the page as it was before sections, built from the theme's
 * other settings (the promo banner from promo, promoImage, promoLink, promoTitle_<lang>, promoText_<lang>).
 */
export function defaultHomeSections(styles: ThemeStyles): HomeSection[] {
  return [
    { id: 'hero', type: 'hero', enabled: true },
    { id: 'benefits', type: 'benefits', enabled: true },
    { id: 'categories', type: 'categories', enabled: true },
    { id: 'products', type: 'products', enabled: true },
    {
      id: 'promo',
      type: 'band',
      enabled: styles.promo === 'block',
      image: styles.promoImage ?? '',
      link: styles.promoLink ?? '',
      text: Object.fromEntries(
        languages.map((lang) => [lang, { title: styles[`promoTitle_${lang}`] ?? '', text: styles[`promoText_${lang}`] ?? '' }]),
      ),
    },
  ];
}

/** The sections the home page shows, in order */
export function visibleHomeSections(styles: ThemeStyles): HomeSection[] {
  return (styles.home ?? defaultHomeSections(styles)).filter((section) => section.enabled);
}

/** A band in one language; null when it has no title there (it is then not shown) */
export function bandView(section: BandSection, lang: LanguageCode): BandView | null {
  const title = section.text[lang]?.title?.trim();
  if (!title) return null;
  const link = section.link?.trim() ?? '';
  return {
    title,
    text: section.text[lang]?.text?.trim() ?? '',
    image: section.image?.trim() ?? '',
    link,
    internal: link.startsWith('/') && !link.startsWith('//'),
    button: section.text[lang]?.button?.trim() ?? '',
    full: section.width === 'full',
  };
}

/** Trip cards in the chosen order; categories that are gone or hidden are left out; null when none is left */
export function tripsView(section: TripsSection, categories: readonly TripCategory[], lang: LanguageCode): TripsView | null {
  const cards = section.categories.flatMap((slug) => {
    const category = categories.find((c) => c.titleUrl === slug);
    return category
      ? [{ titleUrl: category.titleUrl, title: category.title, description: category.description ?? '', image: category.mainImage?.url ?? '' }]
      : [];
  });
  return cards.length ? { title: section.text?.[lang]?.title?.trim() ?? '', cards } : null;
}

/** The sections that appear at most once; the editor always lists them (switched off when unused) */
export const SINGLE_SECTION_TYPES = ['hero', 'benefits', 'categories', 'products'] as const satisfies readonly HomeSectionType[];
/** The same limit as the server (server/src/eshop/theme-styles.ts) */
export const MAX_HOME_SECTIONS = 20;

/** `base`, or `base-2`, `base-3`… when the id is taken */
export function freeSectionId(base: string, sections: readonly HomeSection[]): string {
  const taken = new Set(sections.map((section) => section.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * The layout as the editor shows it: the theme's sections (or the default layout), the hero first and
 * every single section once; the missing ones are added at the end, switched off.
 */
export function editableHomeSections(styles: ThemeStyles): HomeSection[] {
  const sections = [...(styles.home ?? defaultHomeSections(styles))];
  for (const type of SINGLE_SECTION_TYPES) {
    if (!sections.some((section) => section.type === type)) sections.push({ id: freeSectionId(type, sections), type, enabled: false });
  }
  const hero = sections.find((section) => section.type === 'hero')!;
  return [hero, ...sections.filter((section) => section !== hero)];
}

/** A new, empty full-width band (shown once it has a title) */
export function newBand(sections: readonly HomeSection[]): HomeSection {
  return {
    id: freeSectionId('band', sections),
    type: 'band',
    enabled: true,
    image: '',
    link: '',
    width: 'full',
    text: Object.fromEntries(languages.map((lang) => [lang, { title: '', text: '', button: '' }])),
  };
}

/** Default "shop by trip" titles; the admin edits them */
const TRIPS_TITLES: Record<LanguageCode, string> = { en: 'Shop by trip', sk: 'Nakupujte podľa túry', cs: 'Nakupujte podle túry' };

/** A new trips section; its categories are chosen in the editor */
export function newTrips(sections: readonly HomeSection[]): HomeSection {
  return {
    id: freeSectionId('trips', sections),
    type: 'trips',
    enabled: true,
    categories: [],
    text: Object.fromEntries(languages.map((lang) => [lang, { title: TRIPS_TITLES[lang] }])),
  };
}

/** A new row of products on sale (no own title: the Sale translation) */
export function newProductRow(sections: readonly HomeSection[]): HomeSection {
  return { id: freeSectionId('row', sections), type: 'productRow', enabled: true, source: 'sale' };
}

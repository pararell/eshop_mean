// The home page as an ordered list of sections (ThemeStyles.home). Pure functions: no Angular, so
// they are tested with the server's Jest (server/test/client/home-layout.spec.ts).
import type { HomeSection, HomeSectionType, LanguageCode, ThemeStyles } from '@eshop/shared';

import { languages } from './constants';

type BandSection = Extract<HomeSection, { type: 'band' }>;

/** What a band shows in one language */
export interface BandView {
  title: string;
  text: string;
  image: string;
  link: string;
  /** Shop paths navigate in the app; anything else is an ordinary link */
  internal: boolean;
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
  };
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

/** A new, empty band (shown once it has a title) */
export function newBand(sections: readonly HomeSection[]): HomeSection {
  return {
    id: freeSectionId('band', sections),
    type: 'band',
    enabled: true,
    image: '',
    link: '',
    text: Object.fromEntries(languages.map((lang) => [lang, { title: '', text: '' }])),
  };
}

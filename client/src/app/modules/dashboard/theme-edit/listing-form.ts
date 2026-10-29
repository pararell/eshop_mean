// The product listing settings (ThemeStyles.listing) as a FormGroup in the theme form: the All products
// header, the tile interval, the editorial tiles and the featured products per page.
import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import type { LanguageCode, ListingFeatured, ListingStyles, ListingTile } from '@eshop/shared';

import { languages } from '../../../shared/constants';
import { ALL_PRODUCTS_PAGE, DEFAULT_TILE_EVERY, TILE_EVERY_RANGE } from '../../../shared/listing';
import { httpsUrl, shopPathOrHttps } from './home-sections-form';

type Texts<K extends string> = FormGroup<Record<LanguageCode, FormGroup<Record<K, FormControl<string>>>>>;

export type TileGroup = FormGroup<{
  id: FormControl<string>;
  image: FormControl<string>;
  link: FormControl<string>;
  /** Empty = every listing page */
  pages: FormControl<string[]>;
  text: Texts<'title' | 'text' | 'button'>;
}>;

export type FeaturedGroup = FormGroup<{
  page: FormControl<string>;
  source: FormControl<ListingFeatured['source']>;
  product: FormControl<string>;
}>;

export type ListingGroup = FormGroup<{
  headerImage: FormControl<string>;
  headerText: Texts<'title' | 'text'>;
  tileEvery: FormControl<number>;
  tiles: FormArray<TileGroup>;
  featured: FormArray<FeaturedGroup>;
}>;

// The same limits as the server (server/src/eshop/theme-styles.ts)
const MAX = { title: 120, text: 300, button: 40 } as const;

function texts<K extends keyof typeof MAX>(fields: K[], values: Partial<Record<LanguageCode, Partial<Record<K, string>>>> | undefined): Texts<K> {
  return new FormGroup(
    Object.fromEntries(
      languages.map((lang) => [
        lang,
        new FormGroup(
          Object.fromEntries(
            fields.map((field) => [
              field,
              new FormControl(values?.[lang]?.[field] ?? '', { nonNullable: true, validators: [Validators.maxLength(MAX[field])] }),
            ]),
          ) as Record<K, FormControl<string>>,
        ),
      ]),
    ) as Record<LanguageCode, FormGroup<Record<K, FormControl<string>>>>,
  );
}

const required = (validator: typeof httpsUrl) => [Validators.required, validator];

export function tileGroup(tile: ListingTile): TileGroup {
  return new FormGroup({
    id: new FormControl(tile.id, { nonNullable: true }),
    image: new FormControl(tile.image, { nonNullable: true, validators: required(httpsUrl) }),
    link: new FormControl(tile.link, { nonNullable: true, validators: required(shopPathOrHttps) }),
    pages: new FormControl(tile.pages, { nonNullable: true }),
    text: texts(['title', 'text', 'button'], tile.text),
  });
}

/** A chosen product needs its product */
function featuredRules(control: AbstractControl): ValidationErrors | null {
  const group = control as FeaturedGroup;
  return group.controls.source.value === 'product' && !group.controls.product.value ? { productMissing: true } : null;
}

export function featuredGroup(featured: ListingFeatured): FeaturedGroup {
  return new FormGroup(
    {
      page: new FormControl(featured.page, { nonNullable: true }),
      source: new FormControl(featured.source, { nonNullable: true }),
      product: new FormControl(featured.product ?? '', { nonNullable: true }),
    },
    { validators: featuredRules },
  );
}

/** One featured product per page */
function listingRules(control: AbstractControl): ValidationErrors | null {
  const pages = (control as ListingGroup).controls.featured.controls.map((group) => group.controls.page.value);
  return new Set(pages).size === pages.length ? null : { featuredTwice: true };
}

export function listingGroup(listing: ListingStyles | undefined): ListingGroup {
  return new FormGroup(
    {
      headerImage: new FormControl(listing?.header?.image ?? '', { nonNullable: true, validators: [httpsUrl] }),
      headerText: texts(['title', 'text'], listing?.header?.text),
      tileEvery: new FormControl(listing?.tileEvery ?? DEFAULT_TILE_EVERY, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(TILE_EVERY_RANGE.min), Validators.max(TILE_EVERY_RANGE.max), Validators.pattern(/^\d+$/)],
      }),
      tiles: new FormArray((listing?.tiles ?? []).map(tileGroup)),
      featured: new FormArray((listing?.featured ?? []).map(featuredGroup)),
    },
    { validators: listingRules },
  );
}

const trimmed = <T extends Record<string, string>>(values: Partial<Record<LanguageCode, T>>) =>
  Object.fromEntries(
    languages.map((lang) => [lang, Object.fromEntries(Object.entries(values[lang] ?? {}).map(([field, value]) => [field, String(value).trim()]))]),
  ) as Partial<Record<LanguageCode, T>>;

/** The settings as saved: texts trimmed, a featured product only for the product source */
export function listingFromGroup(group: ListingGroup): ListingStyles {
  const value = group.getRawValue();
  return {
    header: { image: value.headerImage.trim(), text: trimmed(value.headerText) },
    tileEvery: Number(value.tileEvery),
    tiles: value.tiles.map((tile) => ({ ...tile, image: tile.image.trim(), link: tile.link.trim(), text: trimmed(tile.text) })),
    featured: value.featured.map(({ page, source, product }) => ({ page, source, ...(source === 'product' ? { product } : {}) })),
  };
}

/** A new tile: an id not used yet, every listing page */
export function newTile(existing: readonly { id: string }[]): ListingTile {
  let n = existing.length + 1;
  while (existing.some((tile) => tile.id === `tile-${n}`)) n++;
  return { id: `tile-${n}`, image: '', link: '', pages: [], text: {} };
}

/** A new featured row for the first page that has none yet (All products first) */
export function newFeatured(existing: readonly { page: string }[], categories: readonly string[]): ListingFeatured {
  const page = [ALL_PRODUCTS_PAGE, ...categories].find((key) => !existing.some((row) => row.page === key)) ?? ALL_PRODUCTS_PAGE;
  return { page, source: 'sale' };
}

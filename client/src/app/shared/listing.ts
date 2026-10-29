// The product listing pages (All products and the categories): their header, the editorial tiles in the
// product grid and the featured product, from the theme's `listing` settings (shared ListingStyles).
import type { LanguageCode, ListingAllPage, ListingFeatured, ListingStyles, ListingTile } from '@eshop/shared';

/** The page key of All products in the listing settings; any other key is a category's titleUrl */
export const ALL_PRODUCTS_PAGE: ListingAllPage = '*';
/** The same limits as the server (server/src/eshop/theme-styles.ts) */
export const DEFAULT_TILE_EVERY = 6;
export const TILE_EVERY_RANGE = { min: 2, max: 24 } as const;
export const MAX_LISTING_TILES = 12;

export interface ListingHeaderView {
  title: string;
  text: string;
  /** Empty = a plain header without a photo */
  image: string;
}

/** What a category page header needs from its category */
export interface HeaderCategory {
  title: string;
  description?: string;
  headerImage?: string | null;
  mainImage?: { url?: string };
}

/**
 * The header of a listing page: a category's header image (else its main image), title and description,
 * or for All products the header from the listing settings, with `fallbackTitle` when it has no title.
 */
export function listingHeader(
  listing: ListingStyles | undefined,
  category: HeaderCategory | undefined,
  lang: LanguageCode,
  fallbackTitle: string,
): ListingHeaderView {
  if (category) {
    return {
      title: category.title,
      text: category.description?.trim() ?? '',
      image: category.headerImage?.trim() || category.mainImage?.url?.trim() || '',
    };
  }
  const text = listing?.header?.text?.[lang];
  return { title: text?.title?.trim() || fallbackTitle, text: text?.text?.trim() ?? '', image: listing?.header?.image?.trim() ?? '' };
}

export interface TileView {
  id: string;
  title: string;
  text: string;
  /** Empty = the Shop_now translation */
  button: string;
  image: string;
  link: string;
  /** A shop path (router link) rather than an external URL */
  internal: boolean;
}

/** The tiles of a listing page in one language, in the admin's order; tiles without a title there are left out */
export function listingTiles(listing: ListingStyles | undefined, page: string, lang: LanguageCode): TileView[] {
  return (listing?.tiles ?? []).flatMap((tile: ListingTile) => {
    const text = tile.text[lang];
    const title = text?.title?.trim();
    if (!title || !tile.image || (tile.pages.length && !tile.pages.includes(page))) return [];
    const link = tile.link.trim();
    return [
      {
        id: tile.id,
        title,
        text: text?.text?.trim() ?? '',
        button: text?.button?.trim() ?? '',
        image: tile.image,
        link,
        internal: link.startsWith('/') && !link.startsWith('//'),
      },
    ];
  });
}

/** The featured product setting of a listing page, if it has one */
export function listingFeatured(listing: ListingStyles | undefined, page: string): ListingFeatured | undefined {
  const featured = listing?.featured?.find((entry) => entry.page === page);
  return featured && (featured.source === 'sale' || featured.product) ? featured : undefined;
}

export type GridItem<P> = { kind: 'featured'; product: P } | { kind: 'product'; product: P } | { kind: 'tile'; tile: TileView };

/**
 * The grid of a listing page: the featured product first (and not again among the others), then the
 * products with a tile after every `every` of them. Each page starts further along the tiles, so the
 * next page shows the next ones; a tile appears at most once per page.
 */
export function listingGrid<P extends { _id: string }>(
  products: readonly P[],
  options: { featured?: P | null; tiles: readonly TileView[]; every?: number; page: number; perPage: number },
): GridItem<P>[] {
  const { featured, tiles } = options;
  const every = Math.max(TILE_EVERY_RANGE.min, Math.round(options.every || DEFAULT_TILE_EVERY));
  const slotsPerPage = Math.max(1, Math.floor(options.perPage / every));
  const offset = tiles.length ? ((Math.max(1, options.page) - 1) * slotsPerPage) % tiles.length : 0;

  const items: GridItem<P>[] = featured ? [{ kind: 'featured', product: featured }] : [];
  const rest = featured ? products.filter((product) => product._id !== featured._id) : products;
  rest.forEach((product, index) => {
    items.push({ kind: 'product', product });
    const slot = (index + 1) / every - 1;
    if (Number.isInteger(slot) && slot < tiles.length) items.push({ kind: 'tile', tile: tiles[(offset + slot) % tiles.length] });
  });
  return items;
}

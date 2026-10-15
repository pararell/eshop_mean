// Row ⇄ API-shape mapping. The API keeps the JSON shapes it had with MongoDB (`_id`, per-language
// sub-objects `en/sk/cs`, `mainImage`, `orderId`, `outcome`, `dateAdded`) so the client and the
// pricing code don't change (docs/postgres-migration.md §4.1). Inputs are normalized the way
// Mongoose casting did: numeric strings become numbers, '' becomes null, booleans accept 'true'.
import type {
  Address,
  CategoryLangInfo,
  Image,
  LanguageCode,
  LocalizedCart,
  OrderStatus,
  PageLangInfo,
  ProductLangInfo,
  ShippingCost,
  ThemeStyles,
} from '@eshop/shared';

import { languages } from '../shared/constans';
import type {
  categories,
  categoryTranslations,
  configs,
  configShipping,
  orders,
  pages,
  pageTranslations,
  products,
  productTranslations,
  themes,
  translations,
  users,
} from './schema';

// Casting helpers (Mongoose-compatible) ----------------------------------------------------------

export const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(number) ? null : number;
};

export const toBool = (value: unknown): boolean => value === true || value === 'true';

/** String cast like Mongoose's: objects and arrays are rejected (the callers answer 4xx) */
export const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') throw new TypeError(`Cast to string failed for ${JSON.stringify(value)}`);
  return String(value);
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== undefined).map(String);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
};

const isLang = (key: string): key is LanguageCode => (languages as string[]).includes(key);

/** Per-language entries of an API object ({ en: {...}, sk: {...} }) */
const langEntries = <T>(input: Record<string, unknown>): [LanguageCode, Partial<T>][] =>
  Object.entries(input).filter(([key, value]) => isLang(key) && value && typeof value === 'object') as [LanguageCode, Partial<T>][];

// Products ---------------------------------------------------------------------------------------

export type ProductRow = (typeof products)['$inferSelect'];
export type ProductTranslationRow = (typeof productTranslations)['$inferSelect'];

/** Product as the API returned it from MongoDB: base fields + one sub-object per language */
export interface ProductDoc {
  _id: string;
  titleUrl: string;
  /** Fields may be missing, as in MongoDB; typed like the shared API contract */
  mainImage: Image;
  images: string[];
  tags: string[];
  _user?: string;
  dateAdded: Date;
  en?: ProductLangInfo;
  sk?: ProductLangInfo;
  cs?: ProductLangInfo;
}

export function toProductDoc(row: ProductRow, langRows: ProductTranslationRow[]): ProductDoc {
  const doc: ProductDoc = {
    _id: row.id,
    titleUrl: row.titleUrl,
    mainImage: { url: row.mainImageUrl ?? undefined, name: row.mainImageName ?? undefined } as Image,
    images: row.images,
    tags: row.tags,
    _user: row.createdBy ?? undefined,
    dateAdded: row.createdAt,
  };
  for (const t of langRows) {
    doc[t.lang] = {
      title: t.title,
      description: t.description,
      descriptionFull: t.descriptionFull,
      regularPrice: t.regularPrice as number,
      salePrice: t.salePrice as number,
      onSale: t.onSale,
      stock: t.stock as string,
      visibility: t.visibility,
      shipping: t.shipping,
    };
  }
  // Mongoose always returned every language (array paths default to []), and the dashboard relies on it
  for (const lang of languages) {
    doc[lang] ??= { descriptionFull: [] } as unknown as ProductLangInfo;
  }
  return doc;
}

/** API product input (admin form) → column values; only the fields present are returned */
export function productValues(input: Record<string, unknown>) {
  const values: Partial<typeof products.$inferInsert> = {};
  if (input.titleUrl !== undefined) values.titleUrl = String(input.titleUrl);
  if (input.mainImage !== undefined) {
    const image = (input.mainImage ?? {}) as { url?: string; name?: string };
    values.mainImageUrl = image.url ?? null;
    values.mainImageName = image.name ?? null;
  }
  if (input.images !== undefined) values.images = toStringArray(input.images);
  if (input.tags !== undefined) values.tags = toStringArray(input.tags);
  return values;
}

export function productTranslationValues(productId: string, input: Record<string, unknown>): (typeof productTranslations.$inferInsert)[] {
  return langEntries<Record<string, unknown>>(input).map(([lang, t]) => ({
    productId,
    lang,
    title: t.title ? String(t.title) : '',
    description: t.description ? String(t.description) : '',
    descriptionFull: toStringArray(t.descriptionFull),
    regularPrice: toNumberOrNull(t.regularPrice),
    salePrice: toNumberOrNull(t.salePrice),
    onSale: toBool(t.onSale),
    stock: t.stock === undefined || t.stock === null ? null : String(t.stock),
    visibility: toBool(t.visibility),
    shipping: t.shipping ? String(t.shipping) : 'basic',
  }));
}

// Categories -------------------------------------------------------------------------------------

export type CategoryRow = (typeof categories)['$inferSelect'];
export type CategoryTranslationRow = (typeof categoryTranslations)['$inferSelect'];

export interface CategoryDoc {
  _id: string;
  titleUrl: string;
  mainImage: Image & { type?: boolean };
  subCategories: string[];
  _user?: string;
  dateAdded: Date;
  en?: CategoryLangInfo;
  sk?: CategoryLangInfo;
  cs?: CategoryLangInfo;
}

export function toCategoryDoc(row: CategoryRow, langRows: CategoryTranslationRow[]): CategoryDoc {
  const doc: CategoryDoc = {
    _id: row.id,
    titleUrl: row.titleUrl,
    mainImage: { url: row.mainImageUrl ?? undefined, name: row.mainImageName ?? undefined, type: row.mainImageCover } as Image & { type: boolean },
    subCategories: row.subCategories,
    _user: row.createdBy ?? undefined,
    dateAdded: row.createdAt,
  };
  for (const t of langRows) {
    doc[t.lang] = {
      title: t.title,
      description: t.description,
      position: t.position ?? undefined,
      visibility: t.visibility,
      menuHidden: t.menuHidden,
    };
  }
  return doc;
}

export function categoryValues(input: Record<string, unknown>) {
  const values: Partial<typeof categories.$inferInsert> = {};
  if (input.titleUrl !== undefined) values.titleUrl = String(input.titleUrl);
  if (input.mainImage !== undefined) {
    const image = (input.mainImage ?? {}) as { url?: string; name?: string; type?: unknown };
    values.mainImageUrl = image.url ?? null;
    values.mainImageName = image.name ?? null;
    values.mainImageCover = toBool(image.type);
  }
  if (input.subCategories !== undefined) values.subCategories = toStringArray(input.subCategories);
  return values;
}

export function categoryTranslationValues(categoryId: string, input: Record<string, unknown>): (typeof categoryTranslations.$inferInsert)[] {
  return langEntries<Record<string, unknown>>(input).map(([lang, t]) => ({
    categoryId,
    lang,
    title: t.title ? String(t.title) : '',
    description: t.description ? String(t.description) : '',
    position: toNumberOrNull(t.position),
    visibility: toBool(t.visibility),
    menuHidden: toBool(t.menuHidden),
  }));
}

// Orders -----------------------------------------------------------------------------------------

export type OrderRow = (typeof orders)['$inferSelect'];

export interface OrderDoc {
  _id: string;
  orderId: string;
  cardId?: string;
  amount: number;
  amount_refunded?: number;
  currency: string;
  status: OrderStatus;
  notes?: string;
  type?: string;
  description?: string;
  customerEmail: string;
  cart: LocalizedCart;
  outcome?: { seller_message: string };
  addresses: Address[];
  dateAdded: Date;
  _user?: string;
}

export function toOrderDoc(row: OrderRow): OrderDoc {
  return {
    _id: row.id,
    orderId: row.orderNumber,
    cardId: row.cardId ?? undefined,
    amount: row.amount,
    amount_refunded: row.amountRefunded ?? undefined,
    currency: row.currency,
    status: row.status,
    notes: row.notes ?? undefined,
    type: row.type ?? undefined,
    description: row.description ?? undefined,
    customerEmail: row.customerEmail,
    cart: row.cart,
    outcome: row.sellerMessage === null ? undefined : { seller_message: row.sellerMessage },
    addresses: row.addresses,
    dateAdded: row.createdAt,
    _user: row.userId ?? undefined,
  };
}

/** API order fields → column values; only known fields (Mongoose ignored unknown ones too) */
export function orderValues(input: Partial<Record<keyof OrderDoc, unknown>>) {
  const values: Partial<typeof orders.$inferInsert> = {};
  if (input.orderId !== undefined) values.orderNumber = String(toStringOrNull(input.orderId));
  if (input.cardId !== undefined) values.cardId = toStringOrNull(input.cardId);
  if (input.amount !== undefined) values.amount = toNumberOrNull(input.amount) ?? 0;
  if (input.amount_refunded !== undefined) values.amountRefunded = toNumberOrNull(input.amount_refunded);
  if (input.currency !== undefined) values.currency = String(toStringOrNull(input.currency));
  if (input.status !== undefined) values.status = input.status as OrderStatus;
  if (input.notes !== undefined) values.notes = toStringOrNull(input.notes);
  if (input.type !== undefined) values.type = toStringOrNull(input.type);
  if (input.description !== undefined) values.description = toStringOrNull(input.description);
  if (input.customerEmail !== undefined) values.customerEmail = String(toStringOrNull(input.customerEmail));
  if (input.cart !== undefined) values.cart = input.cart as LocalizedCart;
  if (input.outcome !== undefined) values.sellerMessage = (input.outcome as { seller_message?: string } | null)?.seller_message ?? null;
  if (input.addresses !== undefined) values.addresses = (input.addresses ?? []) as Address[];
  if (input._user !== undefined) values.userId = input._user === null ? null : String(input._user);
  if (input.dateAdded !== undefined) values.createdAt = new Date(input.dateAdded as string);
  return values;
}

// Users ------------------------------------------------------------------------------------------

export type UserRow = (typeof users)['$inferSelect'];

export interface UserDoc {
  _id: string;
  email: string;
  passwordHash: string | null;
  name?: string;
  googleId?: string;
  roles: string[];
}

export const toUserDoc = (row: UserRow): UserDoc => ({
  _id: row.id,
  email: row.email,
  passwordHash: row.passwordHash,
  name: row.name ?? undefined,
  googleId: row.googleId ?? undefined,
  roles: row.roles,
});

// Pages, themes, configs, translations ------------------------------------------------------------

export interface PageDoc {
  _id: string;
  titleUrl: string;
  dateAdded: Date;
  en?: PageLangInfo;
  sk?: PageLangInfo;
  cs?: PageLangInfo;
}

export function toPageDoc(row: (typeof pages)['$inferSelect'], langRows: (typeof pageTranslations)['$inferSelect'][]): PageDoc {
  const doc: PageDoc = { _id: row.id, titleUrl: row.titleUrl, dateAdded: row.createdAt };
  for (const t of langRows) {
    doc[t.lang] = { title: t.title, contentHTML: t.contentHtml };
  }
  return doc;
}

export function pageTranslationValues(pageId: string, input: Record<string, unknown>): (typeof pageTranslations.$inferInsert)[] {
  return langEntries<Record<string, unknown>>(input).map(([lang, t]) => ({
    pageId,
    lang,
    title: t.title ? String(t.title) : '',
    contentHtml: t.contentHTML ? String(t.contentHTML) : '',
  }));
}

export interface ThemeDoc {
  _id: string;
  titleUrl: string;
  active: boolean;
  styles: ThemeStyles;
  dateAdded: Date;
}

export const toThemeDoc = (row: (typeof themes)['$inferSelect']): ThemeDoc => ({
  _id: row.id,
  titleUrl: row.titleUrl,
  active: row.active,
  styles: row.styles,
  dateAdded: row.createdAt,
});

export interface ConfigDoc {
  _id: string;
  titleUrl: string;
  active: boolean;
  dateAdded: Date;
  en?: { shippingCost: ShippingCost };
  sk?: { shippingCost: ShippingCost };
  cs?: { shippingCost: ShippingCost };
}

export function toConfigDoc(row: (typeof configs)['$inferSelect'], shippingRows: (typeof configShipping)['$inferSelect'][]): ConfigDoc {
  const doc: ConfigDoc = { _id: row.id, titleUrl: row.titleUrl, active: row.active, dateAdded: row.createdAt };
  for (const s of shippingRows) {
    doc[s.lang] = {
      shippingCost: {
        basic: { cost: s.basicCost as number, limit: s.basicLimit as number },
        extended: { cost: s.extendedCost as number, limit: s.extendedLimit as number },
      },
    };
  }
  return doc;
}

export function configShippingValues(configId: string, input: Record<string, unknown>): (typeof configShipping.$inferInsert)[] {
  return langEntries<{ shippingCost?: Partial<Record<'basic' | 'extended', { cost?: unknown; limit?: unknown }>> }>(input).map(([lang, t]) => ({
    configId,
    lang,
    basicCost: toNumberOrNull(t.shippingCost?.basic?.cost),
    basicLimit: toNumberOrNull(t.shippingCost?.basic?.limit),
    extendedCost: toNumberOrNull(t.shippingCost?.extended?.cost),
    extendedLimit: toNumberOrNull(t.shippingCost?.extended?.limit),
  }));
}

export interface TranslationDoc {
  _id: string;
  lang: string;
  keys: Record<string, string>;
}

/** Translations are keyed by language; `_id` mirrors the language for clients that track ids */
export const toTranslationDoc = (row: (typeof translations)['$inferSelect']): TranslationDoc => ({ _id: row.lang, lang: row.lang, keys: row.keys });

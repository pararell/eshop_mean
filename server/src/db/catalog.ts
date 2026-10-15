// Catalog data access shared by ProductsService, CartService and AdminService.
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { LanguageCode } from '@eshop/shared';

import type { Database } from './database.module';
import {
  CategoryDoc,
  categoryTranslationValues,
  categoryValues,
  ProductDoc,
  ProductRow,
  productTranslationValues,
  productValues,
  toCategoryDoc,
  toProductDoc,
} from './mappers';
import { categories, categoryTranslations, products, productTranslations } from './schema';
import { languages } from '../shared/constans';

export const isLanguage = (lang: unknown): lang is LanguageCode => typeof lang === 'string' && (languages as string[]).includes(lang);

/** Escapes % and _ so user input is matched literally by ILIKE (audit SEC-10) */
export const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, (c) => '\\' + c)}%`;

type Tx = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

/** Attaches translations (all languages, or only `lang`) to product rows, keeping the row order */
export async function toProductDocs(db: Tx, rows: ProductRow[], lang?: LanguageCode): Promise<ProductDoc[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const langRows = await db
    .select()
    .from(productTranslations)
    .where(lang ? and(inArray(productTranslations.productId, ids), eq(productTranslations.lang, lang)) : inArray(productTranslations.productId, ids));
  return rows.map((row) =>
    toProductDoc(
      row,
      langRows.filter((t) => t.productId === row.id),
    ),
  );
}

export async function findProduct(db: Tx, by: { titleUrl: string } | { id: string }): Promise<ProductDoc | null> {
  const [row] = await db
    .select()
    .from(products)
    .where('id' in by ? eq(products.id, by.id) : eq(products.titleUrl, by.titleUrl));
  return row ? (await toProductDocs(db, [row]))[0] : null;
}

/** Inserts a product from the admin input shape (base fields + en/sk/cs objects) */
export async function insertProduct(
  db: Database,
  input: Record<string, unknown>,
  extra: Partial<typeof products.$inferInsert> = {},
): Promise<ProductDoc> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(products)
      .values({ ...(productValues(input) as typeof products.$inferInsert), ...extra })
      .returning();
    const langValues = productTranslationValues(row.id, input);
    if (langValues.length) {
      await tx.insert(productTranslations).values(langValues);
    }
    return (await toProductDocs(tx, [row]))[0];
  });
}

/**
 * Like Mongo's findOneAndUpdate(..., { upsert: true }) without `new`: updates the given fields (and
 * replaces the given languages) or inserts. Returns the product before the update, or null when it
 * was inserted.
 */
export async function upsertProduct(db: Database, input: Record<string, unknown>): Promise<ProductDoc | null> {
  return db.transaction(async (tx) => {
    const titleUrl = String(input.titleUrl);
    const [existing] = await tx.select().from(products).where(eq(products.titleUrl, titleUrl));
    const before = existing ? (await toProductDocs(tx, [existing]))[0] : null;

    let id = existing?.id;
    const values = productValues(input);
    if (existing) {
      if (Object.keys(values).length) {
        await tx.update(products).set(values).where(eq(products.id, existing.id));
      }
    } else {
      [{ id }] = await tx
        .insert(products)
        .values(values as typeof products.$inferInsert)
        .returning({ id: products.id });
    }

    for (const t of productTranslationValues(id!, input)) {
      const { productId: _productId, lang: _lang, ...rest } = t;
      await tx
        .insert(productTranslations)
        .values(t)
        .onConflictDoUpdate({ target: [productTranslations.productId, productTranslations.lang], set: rest });
    }
    return before;
  });
}

// Categories -------------------------------------------------------------------------------------

export async function toCategoryDocs(db: Tx, rows: (typeof categories.$inferSelect)[], lang?: LanguageCode): Promise<CategoryDoc[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const langRows = await db
    .select()
    .from(categoryTranslations)
    .where(
      lang ? and(inArray(categoryTranslations.categoryId, ids), eq(categoryTranslations.lang, lang)) : inArray(categoryTranslations.categoryId, ids),
    );
  return rows.map((row) =>
    toCategoryDoc(
      row,
      langRows.filter((t) => t.categoryId === row.id),
    ),
  );
}

/** Inserts a category unless one with the same titleUrl exists. Returns true when inserted. */
export async function insertCategoryIfMissing(db: Database, input: Record<string, unknown>): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(categories)
      .values(categoryValues(input) as typeof categories.$inferInsert)
      .onConflictDoNothing({ target: categories.titleUrl })
      .returning({ id: categories.id });
    if (!row) return false;
    const langValues = categoryTranslationValues(row.id, input);
    if (langValues.length) {
      await tx.insert(categoryTranslations).values(langValues);
    }
    return true;
  });
}

/** Same contract as upsertProduct, for categories. */
export async function upsertCategory(db: Database, input: Record<string, unknown>): Promise<CategoryDoc | null> {
  return db.transaction(async (tx) => {
    const titleUrl = String(input.titleUrl);
    const [existing] = await tx.select().from(categories).where(eq(categories.titleUrl, titleUrl));
    const before = existing ? (await toCategoryDocs(tx, [existing]))[0] : null;

    let id = existing?.id;
    const values = categoryValues(input);
    if (existing) {
      if (Object.keys(values).length) {
        await tx.update(categories).set(values).where(eq(categories.id, existing.id));
      }
    } else {
      [{ id }] = await tx
        .insert(categories)
        .values(values as typeof categories.$inferInsert)
        .returning({ id: categories.id });
    }

    for (const t of categoryTranslationValues(id!, input)) {
      const { categoryId: _categoryId, lang: _lang, ...rest } = t;
      await tx
        .insert(categoryTranslations)
        .values(t)
        .onConflictDoUpdate({ target: [categoryTranslations.categoryId, categoryTranslations.lang], set: rest });
    }
    return before;
  });
}

/** Removes a category tag from every product that has it (one statement; audit PERF-01). */
export async function removeTagFromProducts(db: Database, tag: string): Promise<void> {
  await db
    .update(products)
    .set({ tags: sql`array_remove(${products.tags}, ${tag})` })
    .where(sql`${tag} = ANY(${products.tags})`);
}

/** Adds or removes an image URL on a product (Mongo $push / $pull). Returns the updated product or null. */
export async function updateProductImages(db: Database, titleUrl: string, op: 'append' | 'remove', image: string): Promise<ProductDoc | null> {
  const [row] = await db
    .update(products)
    .set({ images: op === 'append' ? sql`array_append(${products.images}, ${image})` : sql`array_remove(${products.images}, ${image})` })
    .where(eq(products.titleUrl, titleUrl))
    .returning();
  return row ? (await toProductDocs(db, [row]))[0] : null;
}

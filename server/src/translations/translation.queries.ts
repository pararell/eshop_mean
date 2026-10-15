import { eq } from 'drizzle-orm';

import type { Database } from '../db/database.module';
import { isLanguage } from '../db/catalog';
import { toTranslationDoc, TranslationDoc } from '../db/mappers';
import { translations } from '../db/schema';

/** Translation document of a language, or null (unknown languages match nothing, as with MongoDB) */
export async function findTranslation(db: Database, lang: unknown): Promise<TranslationDoc | null> {
  if (!isLanguage(lang)) return null;
  const [row] = await db.select().from(translations).where(eq(translations.lang, lang));
  return row ? toTranslationDoc(row) : null;
}

// npm run db:export-translations: one-off, read-only export of the UI translations from the
// current MongoDB into server/seed/translations.json (docs/postgres-migration.md §5).
// Env: MONGO_URI. Nothing else is taken from MongoDB.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import mongoose from 'mongoose';

import TranslationSchema from '../src/translations/schemas/translation.schema';
import { languages } from '../src/shared/constans';
import { requireEnv, TRANSLATIONS_SEED_FILE } from './script-utils';

const sortKeys = (keys: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(keys)
      .filter(([, value]) => typeof value === 'string')
      .sort(([a], [b]) => a.localeCompare(b)),
  ) as Record<string, string>;

async function main() {
  const connection = await mongoose.createConnection(requireEnv('MONGO_URI')).asPromise();
  try {
    const Translation = connection.model('Translation', TranslationSchema);
    const docs = await Translation.find({}).lean<{ lang: string; keys?: Record<string, unknown> }[]>();

    const output: Record<string, Record<string, string>> = {};
    for (const lang of languages) {
      const doc = docs.find((d) => d.lang === lang);
      output[lang] = sortKeys(doc?.keys ?? {});
      console.log(`${lang}: ${Object.keys(output[lang]).length} keys${doc ? '' : ' (no document found)'}`);
    }
    const skipped = docs.filter((d) => !(languages as string[]).includes(d.lang)).map((d) => d.lang);
    if (skipped.length) {
      console.warn(`Ignored translations for unsupported languages: ${skipped.join(', ')}`);
    }

    mkdirSync(dirname(TRANSLATIONS_SEED_FILE), { recursive: true });
    writeFileSync(TRANSLATIONS_SEED_FILE, JSON.stringify(output, null, 2) + '\n');
    console.log(`Written ${TRANSLATIONS_SEED_FILE}`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

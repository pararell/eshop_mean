import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { LanguageCode } from '@eshop/shared';

import type { Database } from './database.module';
import { configs, configShipping, themes, translations, users } from './schema';
import { languages, shippingCost } from '../shared/constans';
import { PASSWORD_RULE } from '../auth/dto/auth-credential.dto';

export interface SeedOptions {
  /** Creates this admin unless a user with the same email exists */
  adminEmail?: string;
  adminPassword?: string;
  /** UI translations per language (server/seed/translations.json) */
  translations?: Partial<Record<LanguageCode, Record<string, string>>>;
}

export interface SeedResult {
  admin: 'created' | 'exists' | 'skipped';
  translations: LanguageCode[];
  config: 'created' | 'exists';
  theme: 'created' | 'exists';
}

/**
 * Initial data for a fresh database (docs/postgres-migration.md §5). Idempotent and additive:
 * it only fills what is missing and never overwrites data edited in the dashboard.
 */
export async function seed(db: Database, options: SeedOptions = {}): Promise<SeedResult> {
  return db.transaction(async (tx) => {
    const result: SeedResult = { admin: 'skipped', translations: [], config: 'exists', theme: 'exists' };

    if (options.adminEmail && options.adminPassword) {
      const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, options.adminEmail));
      // A new admin gets a password that sign-up would accept too; an existing one is left alone
      if (!existing && !PASSWORD_RULE.test(options.adminPassword)) {
        throw new Error('SEED_ADMIN_PASSWORD must be 5-20 characters and contain a digit (the sign-up password rule)');
      }
      const created = await tx
        .insert(users)
        .values({
          email: options.adminEmail,
          passwordHash: await bcrypt.hash(options.adminPassword, 10),
          roles: ['admin'],
        })
        .onConflictDoNothing()
        .returning({ id: users.id });
      result.admin = created.length ? 'created' : 'exists';
    }

    for (const lang of languages) {
      const created = await tx
        .insert(translations)
        .values({ lang, keys: options.translations?.[lang] ?? {} })
        .onConflictDoNothing()
        .returning({ lang: translations.lang });
      if (created.length) {
        result.translations.push(lang);
      }
    }

    // Default shop config with the built-in shipping costs, only if there is no config at all
    if (!(await tx.select({ id: configs.id }).from(configs).limit(1)).length) {
      const [config] = await tx.insert(configs).values({ titleUrl: 'default', active: true }).returning({ id: configs.id });
      await tx.insert(configShipping).values(
        languages.map((lang) => ({
          configId: config.id,
          lang,
          basicCost: shippingCost[lang].basic.cost,
          basicLimit: shippingCost[lang].basic.limit,
          extendedCost: shippingCost[lang].extended.cost,
          extendedLimit: shippingCost[lang].extended.limit,
        })),
      );
      result.config = 'created';
    }

    // Neutral default theme (empty styles = the built-in look), only if there is no theme at all
    if (!(await tx.select({ id: themes.id }).from(themes).limit(1)).length) {
      await tx.insert(themes).values({ titleUrl: 'default', active: true, styles: {} });
      result.theme = 'created';
    }

    return result;
  });
}

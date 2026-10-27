import { eq } from 'drizzle-orm';
import type { LanguageCode } from '@eshop/shared';

import type { Database } from '../../../db/database.module';
import { themes } from '../../../db/schema';
import { findTranslation } from '../../../translations/translation.queries';
import { EmailShop, readableOn } from './email-layout';
import { adminEmails } from './mailer';

const DEFAULT_ACCENT = '#111111';

/**
 * Shop name (the active theme's `shopName`, else the `ESHOP_TITLE` translation, as in the shop), URL
 * (`ORIGIN`), accent (the active theme's primary color)
 * and contact address (the first of `ADMIN_EMAILS`). Never throws: falls back to defaults.
 */
export async function loadEmailShop(db: Database, lang: LanguageCode): Promise<EmailShop> {
  const [translation, theme] = await Promise.all([
    findTranslation(db, lang).catch(() => null),
    db
      .select({ styles: themes.styles })
      .from(themes)
      .where(eq(themes.active, true))
      .then((rows) => rows[0])
      .catch(() => undefined),
  ]);
  const color = theme?.styles?.primaryColor;
  const accent = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_ACCENT;
  return {
    name: theme?.styles?.shopName?.trim() || translation?.keys?.ESHOP_TITLE?.trim() || 'Eshop',
    url: (process.env.ORIGIN || 'http://localhost:4000').replace(/\/$/, ''),
    accent,
    onAccent: readableOn(accent),
    contactEmail: adminEmails()[0],
  };
}

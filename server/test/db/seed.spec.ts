import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { configs, configShipping, themes, translations, users } from '../../src/db/schema';
import { seed } from '../../src/db/seed';
import { createTestDatabase, TestDatabase } from '../utils/test-db';

describe('db:seed', () => {
  let t: TestDatabase;

  beforeEach(async () => {
    t = await createTestDatabase();
  });
  afterEach(() => t.drop());

  const options = {
    adminEmail: 'admin@shop.test',
    adminPassword: 'Secret123',
    translations: { en: { Back: 'Back' }, sk: { Back: 'Späť' } },
  };

  it('fills an empty database', async () => {
    const result = await seed(t.db, options);

    expect(result).toEqual({ admin: 'created', translations: ['en', 'sk', 'cs'], config: 'created', theme: 'created' });

    const [admin] = await t.db.select().from(users);
    expect(admin).toMatchObject({ email: 'admin@shop.test', roles: ['admin'] });
    expect(await bcrypt.compare('Secret123', admin.passwordHash!)).toBe(true);

    const langs = await t.db.select().from(translations).orderBy(translations.lang);
    expect(langs.map((l) => [l.lang, l.keys])).toEqual([
      ['en', { Back: 'Back' }],
      ['sk', { Back: 'Späť' }],
      ['cs', {}],
    ]);

    // default config uses the built-in shipping table (server/src/shared/constans.ts)
    const [config] = await t.db.select().from(configs);
    expect(config).toMatchObject({ titleUrl: 'default', active: true });
    const shipping = await t.db.select().from(configShipping).where(eq(configShipping.configId, config.id)).orderBy(configShipping.lang);
    expect(shipping.map((s) => [s.lang, s.basicCost, s.basicLimit, s.extendedCost, s.extendedLimit])).toEqual([
      ['en', 5, 100, 10, 200],
      ['sk', 5, 100, 10, 200],
      ['cs', 150, 3000, 300, 6000],
    ]);

    const [theme] = await t.db.select().from(themes);
    expect(theme).toMatchObject({ titleUrl: 'default', active: true, styles: {} });
  });

  it('is idempotent and never overwrites existing data', async () => {
    await seed(t.db, options);
    // simulate dashboard edits
    await t.db
      .update(translations)
      .set({ keys: { Back: 'Naspäť' } })
      .where(eq(translations.lang, 'sk'));
    await t.db.update(users).set({ name: 'Owner' }).where(eq(users.email, 'admin@shop.test'));

    const second = await seed(t.db, { ...options, adminEmail: 'ADMIN@shop.test' });

    expect(second).toEqual({ admin: 'exists', translations: [], config: 'exists', theme: 'exists' });
    expect(await t.db.select().from(users)).toHaveLength(1);
    expect(await t.db.select().from(configs)).toHaveLength(1);
    expect(await t.db.select().from(themes)).toHaveLength(1);
    const [sk] = await t.db.select().from(translations).where(eq(translations.lang, 'sk'));
    expect(sk.keys).toEqual({ Back: 'Naspäť' });
  });

  it('skips the admin when no credentials are given', async () => {
    const result = await seed(t.db, {});
    expect(result.admin).toBe('skipped');
    expect(await t.db.select().from(users)).toHaveLength(0);
  });
});

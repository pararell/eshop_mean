import { Client } from 'pg';

import { checkMigrations, migrateWithLock, MIGRATIONS_FOLDER } from '../../src/db/migrate';
import { prepareDatabase } from '../../src/db/startup';
import { createTestDatabase, TestDatabase } from '../utils/test-db';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const allTags = (JSON.parse(readFileSync(resolve(MIGRATIONS_FOLDER, 'meta/_journal.json'), 'utf8')) as { entries: { tag: string }[] }).entries.map(
  (e) => e.tag,
);

const tableExists = async (url: string, table: string) => {
  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ exists: boolean }>('SELECT to_regclass($1) IS NOT NULL AS exists', [table]);
  await client.end();
  return rows[0].exists;
};

describe('migrations at startup', () => {
  let database: TestDatabase;
  const savedUrl = process.env.DATABASE_URL;
  const logger = { log: jest.fn(), error: jest.fn() };

  beforeEach(async () => {
    database = await createTestDatabase({ empty: true });
    jest.clearAllMocks();
  });
  afterEach(async () => {
    process.env.DATABASE_URL = savedUrl;
    delete process.env.DB_MIGRATE_ON_START;
    await database.drop();
  });

  it('lists every migration as pending on an empty database', async () => {
    expect(await checkMigrations(database.url)).toEqual(allTags);
  });

  it('applies pending migrations once, then reports none', async () => {
    expect(await migrateWithLock(database.url)).toEqual(allTags);
    expect(await tableExists(database.url, 'public.ai_usage')).toBe(true);
    expect(await checkMigrations(database.url)).toEqual([]);
    expect(await migrateWithLock(database.url)).toEqual([]);
  });

  it('lets concurrent containers migrate one after another', async () => {
    const results = await Promise.all([migrateWithLock(database.url), migrateWithLock(database.url), migrateWithLock(database.url)]);

    // exactly one applies everything; the others wait for the lock and find nothing to do
    expect(results.filter((tags) => tags.length)).toEqual([allTags]);
    expect(await checkMigrations(database.url)).toEqual([]);
  });

  it('prepareDatabase migrates by default and logs what it applied', async () => {
    process.env.DATABASE_URL = database.url;

    await prepareDatabase(logger as never);

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^Applied ${allTags.length} migration\\(s\\) in \\d+ ms: ${allTags.join(', ')}$`)),
    );
    await prepareDatabase(logger as never);
    expect(logger.log).toHaveBeenLastCalledWith('Database schema is up to date');
  });

  it('with DB_MIGRATE_ON_START=false only reports pending migrations', async () => {
    process.env.DATABASE_URL = database.url;
    process.env.DB_MIGRATE_ON_START = 'false';

    await prepareDatabase(logger as never);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`${allTags.length} pending migration(s): ${allTags.join(', ')}`));
    expect(await tableExists(database.url, 'public.products')).toBe(false);
  });

  it('fails without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    await expect(prepareDatabase(logger as never)).rejects.toThrow('DATABASE_URL is not set');
  });
});

import { resolve } from 'node:path';

/** Optional seed file for the UI translations ({ en: {...}, sk: {...}, cs: {...} }), repository root relative. */
export const TRANSLATIONS_SEED_FILE = resolve(process.cwd(), 'server/seed/translations.json');

/** Scripts read configuration only from the environment, never from .env, so a production URL is always explicit. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set.`);
    process.exit(1);
  }
  return value;
}

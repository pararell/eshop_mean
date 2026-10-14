import { languages } from '../shared/constants';

const LANGUAGE_PREFIX = new RegExp(`^/(${languages.join('|')})(?=/|\\?|#|$)`);

/** Language from the first URL segment (`/sk/product/all` → `sk`), or undefined (e.g. `/`). */
export function languageFromUrl(url: string): string | undefined {
  return LANGUAGE_PREFIX.exec(url)?.[1];
}

/** Same URL with a different language prefix (`/en/cart?x=1` → `/sk/cart?x=1`). */
export function replaceUrlLanguage(url: string, lang: string): string {
  return url.replace(LANGUAGE_PREFIX, `/${lang}`);
}

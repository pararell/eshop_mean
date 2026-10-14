import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { currencyLang } from '../shared/constants';
import { SignalStore } from '../store/signal.store';
import { languageFromUrl } from '../utils/language-url';
import { TranslateService } from './translate.service';

/**
 * The URL prefix (/en, /sk, /cs) is the source of truth for the language (audit BUG-03).
 * Navigating to another prefix switches the app language; the store change triggers loading the
 * translations (see AppComponent). The initial language is set from the URL at startup.
 */
export const languageGuard: CanActivateFn = (_route, state) => {
  const lang = languageFromUrl(state.url);
  const translate = inject(TranslateService);

  if (lang && lang !== translate.lang) {
    inject(SignalStore).changeLanguage({ lang, currency: currencyLang[lang] });
  }
  return true;
};

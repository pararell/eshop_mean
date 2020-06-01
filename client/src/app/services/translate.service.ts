import { BehaviorSubject, Observable } from 'rxjs';
import { Injectable, Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

import { ApiService } from './api.service';
import { languages } from '../shared/constants';
import { Translations } from '../shared/models';
import { take } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class TranslateService {

  translationsSub$  : BehaviorSubject<{[key: string]: string}> = new BehaviorSubject({});
  languageSub$      = new BehaviorSubject('');
  lang: string;

  constructor(private injector: Injector) {}

  private get apiService(): ApiService {
    return this.injector.get(ApiService);
  }

  private get cookie(): CookieService {
    return this.injector.get(CookieService);
  }

  getLang$() {
    return this.languageSub$.asObservable();
  }

  getTranslations$(): Observable<{[key: string]: string}> {
    return this.translationsSub$.asObservable();
  }

  getTranslationsData(lang: string) {
    try {
      return this.apiService.getLangTranslations(lang).pipe(take(1))
       .subscribe(
        (translations: Translations) => {
          if (!lang && translations) {
            this.setLang(translations.lang);
          } else if (!lang) {
            this.setLang(languages[0]);
          }
          const translationKeys = translations && translations['keys'] ? translations['keys'] : {};
          this.translationsSub$.next(translationKeys);
          return Object.assign({}, translationKeys);
        },
        error => {
          return {};
        }
      );
    } catch {
      return {};
    }

  }

  use(lang: string): Promise<{}> {
    return new Promise<{}>((resolve, reject) => {
      const foundLang = lang || this.cookie.get('eshop_lang');
      resolve(this.setTranslations(foundLang));
    });
  }

  private setTranslations(lang: string) {
    if (lang) {
      this.setLang(lang);
    } else {
      this.setLang(languages[0]);
    }

    const langToSend = lang || languages[0];

    return this.getTranslationsData(langToSend);
  }

  private setLang(lang: string): void {
    this.languageSub$.next(lang);
    this.cookie.set('eshop_lang', lang);
    this.lang = lang;
  }
}

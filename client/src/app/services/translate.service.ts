import { filter, take } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { Injectable, Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {

  translationsSub$  : BehaviorSubject<any> = new BehaviorSubject({});
  languageSub$      : BehaviorSubject<any> = new BehaviorSubject('');

  data = {};
  lang = '';

  constructor(private injector: Injector) {}

  private get _apiService(): ApiService {
    return this.injector.get(ApiService);
  }

  private get _cookie(): CookieService {
    return this.injector.get(CookieService);
  }

  getLocation$() {
    return this._apiService.getLocation$().pipe(filter(Boolean, take(1)));
  }

  getTranslationsData(lang: string) {
    return this._apiService.getLangTranslations(lang).subscribe(
      (translation: any) => {
        const translationKeys = translation && translation['keys'] ? translation['keys'] : {};
        this.translationsSub$.next(translationKeys);
        return Object.assign({}, translationKeys);
      },
      error => {
        return {};
      }
    );
  }

  use(lang: string): Promise<{}> {
    return new Promise<{}>((resolve, reject) => {
      const foundLang   = lang || this._cookie.get('lang');
      const defaultLang = 'en';
      const useLang     = foundLang || defaultLang;
      this.data         = this.getTranslationsData(useLang);
      this.lang         = useLang;

      if (lang || !this._cookie.get('lang')) {
        this._cookie.set('lang', useLang);
      }

      this.languageSub$.next(useLang);
      resolve(this.data);
    });
  }
}

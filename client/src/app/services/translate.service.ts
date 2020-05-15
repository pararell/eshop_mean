import { filter, take } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';
import { Injectable, Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

import { ApiService } from './api.service';
import { languages } from '../shared/constants';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {

  translationsSub$  : BehaviorSubject<any> = new BehaviorSubject({});
  languageSub$      = new BehaviorSubject('');

  constructor(private injector: Injector) {}

  private get apiService(): ApiService {
    return this.injector.get(ApiService);
  }

  private get cookie(): CookieService {
    return this.injector.get(CookieService);
  }

  getLocation$() {
    return this.apiService.getLocation$().pipe(filter(Boolean, take(1)));
  }

  getLang$() {
    return this.languageSub$.asObservable();
  }

  getTranslations$(): Observable<any> {
    return this.translationsSub$.asObservable();
  }

  getTranslationsData(lang: string) {
    return this.apiService.getLangTranslations(lang).subscribe(
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
      const foundLang = lang || this.cookie.get('eshop_lang');
      if (!foundLang) {
        this.getLocation$().toPromise()
          .then((langByIP: string) => {
            resolve(this.setTranslations(langByIP));
          }, (error) => {
            const defaultLang = languages[0];
            resolve(this.setTranslations(defaultLang));
        })
      } else {
        resolve(this.setTranslations(foundLang));
      }
    });
  }

  private setTranslations(lang: string) {
    this.languageSub$.next(lang);
    this.cookie.set('eshop_lang', lang);

    return this.getTranslationsData(lang);
  }
}

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { shareReplay, map, filter, take } from 'rxjs/operators';

import { ApiService } from './api.service';
import { ThemeService } from './theme.service';

export interface Config {
  FE_STRIPE_PUBLISHABLE_KEY: string;
  FE_TINYMCE_API_KEY: string;
  FE_RECAPTCHA_CLIENT_KEY: string;
  [name: string]: any;
}


@Injectable({
  providedIn: 'root'
})
export class EnvConfigurationService {
  public configuration$: Observable<Config>;
  public config: Config;

  constructor(
    private apiService: ApiService,
    private themeService: ThemeService,
    @Inject(PLATFORM_ID)
    private platformId : Object) {
      }

      getConfigType$(type: string): Observable<string> {
        return this.configuration$.pipe(map((configuration: Config) => configuration[type]));
      }

      setTheme(conf: Config) {
        if (conf.styles) {
          Object.keys(conf.styles).map(style => {
            const styleValue = conf.styles[style];

            if (style.includes('Color')) {
              const colorName = style.split(/(?=[A-Z])/).join('-').toLowerCase();
              this.themeService.setColor(styleValue, colorName);

              if (style.includes('primary')) {
                this.themeService.setThemeColor(styleValue, 'theme-primary');
              }

              if (style.includes('secondary')) {
                this.themeService.setThemeColor(styleValue, 'theme-secondary');
              }
            };
          });
        }
      }

      load(): Observable<Config> {
        if (!this.configuration$) {
          this.configuration$ = this.apiService.getConfig().pipe(
              filter(() => isPlatformBrowser(this.platformId)),
              map((response: {config: string}) => response.config ? JSON.parse(atob(response.config)) : {}),
              shareReplay(1));
          this.configuration$.pipe(take(1), filter(conf => !!conf))
            .subscribe(conf => { this.config = conf; this.setTheme(conf) });
        }
        return this.configuration$;
      }
}

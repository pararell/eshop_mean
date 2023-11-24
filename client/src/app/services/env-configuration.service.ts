import { AnalyticsService } from './analytics.service';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { shareReplay, map, filter, take } from 'rxjs/operators';

import { ApiService } from './api.service';
import { ThemeService } from './theme.service';

export interface Config {
  FE_STRIPE_PUBLISHABLE_KEY?: string;
  FE_TINYMCE_API_KEY?: string;
  FE_RECAPTCHA_CLIENT_KEY?: string;
  FE_ANALYTICS_TOKEN?: string;
  [name: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class EnvConfigurationService {
  public configuration$: Observable<Config>;
  public config: Config;

  constructor(
    private apiService: ApiService,
    private themeService: ThemeService,
    private analyticsService: AnalyticsService,
    @Inject(PLATFORM_ID)
    private platformId: Object
  ) {}

  getConfigType$(type: string): Observable<string> {
    return this.configuration$.pipe(map((configuration: Config) => configuration[type]));
  }

  setTheme(conf: Config) {
    if (conf.styles) {
      Object.keys(conf.styles).map((style) => {
        const styleValue = conf.styles[style];
        if (styleValue) {
          const varName = style
            .split(/(?=[A-Z])/)
            .join('-')
            .toLowerCase();

          if (style === 'promoSlideBackground') {
            this.themeService.setCSSVariable(`url(${styleValue})`, `${varName}`);
            return;
          }
          if (style === 'promoSlideBackgroundPosition') {
            this.themeService.setCSSVariable(`${styleValue}`, `${varName}`);
            return;
          }
          if (style.includes('Background')) {
            this.themeService.setCSSVariable(`url(${styleValue})`, `${varName}-url`);
            return;
          }
          if (style === 'logo') {
            this.themeService.setCSSVariable(`url(${styleValue})`, 'logo');
            return;
          }

          this.themeService.setCSSVariable(styleValue, varName);
          if (style.includes('Color')) {
            if (style.includes('primary')) {
              this.themeService.setThemeColor(styleValue, 'theme-primary');
            }

            if (style.includes('secondary')) {
              this.themeService.setThemeColor(styleValue, 'theme-secondary');
            }
          }
        }
      });
    }
  }

  load(): Observable<Config> {
    if (!this.configuration$) {
      this.configuration$ = this.apiService.getConfig().pipe(
        filter(() => isPlatformBrowser(this.platformId)),
        map((response: { config: string }) => (response.config ? JSON.parse(atob(response.config)) : {})),
        shareReplay(1)
      );
      this.configuration$
        .pipe(
          filter((conf) => !!conf),
          take(1)
        )
        .subscribe((conf) => {
          this.config = conf;
          this.setTheme(conf);
          this.analyticsService.initial(conf);
        });
    }
    return this.configuration$;
  }
}

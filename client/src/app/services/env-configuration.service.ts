import { AnalyticsService } from './analytics.service';
import { Injectable, Inject, PLATFORM_ID, makeStateKey, TransferState } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { shareReplay, map, tap } from 'rxjs/operators';

import { ApiService } from './api.service';
import { ThemeService } from './theme.service';

export interface Config {
  FE_STRIPE_PUBLISHABLE_KEY?: string;
  FE_TINYMCE_API_KEY?: string;
  FE_RECAPTCHA_CLIENT_KEY?: string;
  FE_ANALYTICS_TOKEN?: string;
  [name: string]: any;
}

export const THEME_CONFIG_KEY = makeStateKey<Config>('themeConfig');

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
    private transferState: TransferState,
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
          if (style === 'promoSlideVideo') {
           this.themeService.setVideo(styleValue);
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
      // On the client, check TransferState first to avoid flicker
      if (isPlatformBrowser(this.platformId)) {
        const storedConfig = this.transferState.get(THEME_CONFIG_KEY, undefined);
        if (storedConfig) {
          this.config = storedConfig;
          this.setTheme(storedConfig);
        }
      }

      this.configuration$ = this.apiService.getConfig().pipe(
        map((response: { config: string }) => (response.config ? JSON.parse(atob(response.config)) : {})),
        tap((conf) => {
          if (conf && Object.keys(conf).length) {
            this.config = conf;
            // Apply theme synchronously within the observable pipeline the APP_INITIALIZER waits on
            this.setTheme(conf);
            // Store in TransferState for client to use on subsequent navigation
            if (!isPlatformBrowser(this.platformId)) {
              this.transferState.set(THEME_CONFIG_KEY, conf);
            }
            if (isPlatformBrowser(this.platformId)) {
              this.analyticsService.initial(conf);
            }
          }
        }),
        shareReplay(1)
      );
    }
    return this.configuration$;
  }
}
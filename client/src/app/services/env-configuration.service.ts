import type { ThemeStyles } from '@eshop/shared';
import { AnalyticsService } from './analytics.service';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
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
  /** Active theme styles (see ThemeService) */
  styles?: ThemeStyles;
  [name: string]: string | ThemeStyles | undefined;
}

@Injectable({
  providedIn: 'root',
})
export class EnvConfigurationService {
  private apiService = inject(ApiService);
  private themeService = inject(ThemeService);
  private analyticsService = inject(AnalyticsService);
  private platformId = inject(PLATFORM_ID);

  public configuration$!: Observable<Config>;
  public config!: Config;

  getConfigType$(type: string): Observable<string> {
    return this.configuration$.pipe(map((configuration: Config) => configuration[type] as string));
  }

  setTheme(conf: Config) {
    if (conf.styles) {
      Object.keys(conf.styles).map((style) => {
        const styleValue = conf.styles![style];
        if (styleValue) {
          const varName = style
            .split(/(?=[A-Z])/)
            .join('-')
            .toLowerCase();

          if (style === 'promoSlideBackground') {
            this.themeService.setCSSVariable(`url(${styleValue})`, `${varName}`);
            this.themeService.heroImage.set(styleValue);
            return;
          }
          if (style === 'promoSlideBackgroundPosition') {
            this.themeService.setCSSVariable(`${styleValue}`, `${varName}`);
            this.themeService.heroImagePosition.set(styleValue);
            return;
          }
          if (style.includes('Background')) {
            this.themeService.setCSSVariable(`url(${styleValue})`, `${varName}-url`);
            return;
          }
          if (style === 'logo') {
            this.themeService.setCSSVariable(`url(${styleValue})`, 'logo');
            this.themeService.logo.set(styleValue);
            return;
          }
          if (style === 'promoSlideVideo') {
            this.themeService.setVideo(styleValue);
          }

          if (style === 'primaryColor') {
            // Contrast-checked light/dark brand variants (design tokens), not the raw color
            this.themeService.setBrandColor(styleValue);
            return;
          }
          if (style === 'secondaryColor' || style === 'backgroundColor') {
            // Replaced by the design tokens (light/dark surfaces); typed theme tokens come with M4
            return;
          }

          this.themeService.setCSSVariable(styleValue, varName);
        }
      });
    }
  }

  load(): Observable<Config> {
    if (!this.configuration$) {
      this.configuration$ = this.apiService.getConfig().pipe(
        filter(() => isPlatformBrowser(this.platformId)),
        map((response: { config: string }) => (response.config ? JSON.parse(atob(response.config)) : {})),
        shareReplay(1),
      );
      this.configuration$
        .pipe(
          filter((conf) => !!conf),
          take(1),
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

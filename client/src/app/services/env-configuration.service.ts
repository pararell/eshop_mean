import type { ThemeStyles } from '@eshop/shared';
import { AnalyticsService } from './analytics.service';
import { Injectable, inject } from '@angular/core';
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

  public configuration$!: Observable<Config>;
  public config!: Config;

  getConfigType$(type: string): Observable<string> {
    return this.configuration$.pipe(map((configuration: Config) => configuration[type] as string));
  }

  setTheme(conf: Config) {
    this.themeService.applyStyles(conf.styles ?? {});
  }

  load(): Observable<Config> {
    if (!this.configuration$) {
      // Also during SSR: the theme (brand color, logo, home banner) is then in the first HTML, so
      // nothing shifts after hydration; the HTTP transfer cache hands the response to the browser
      this.configuration$ = this.apiService.getConfig().pipe(
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

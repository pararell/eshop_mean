import { PlatformLocation } from '@angular/common';
import { languageFromUrl } from './utils/language-url';
import { APP_INITIALIZER, ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { routes } from './app.routes';
import { provideClientHydration, withHttpTransferCacheOptions, withNoIncrementalHydration } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch } from '@angular/common/http';
import { TranslateService } from './services/translate.service';
import { WindowService } from './services/window.service';
import { EnvConfigurationService } from './services/env-configuration.service';
import { BrowserHttpInterceptor } from './services/browser-http-interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';

export function WindowFactory() {
  return typeof window !== 'undefined' ? window : {};
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: true,
        includeRequestsWithAuthHeaders: true,
      }),
      withNoIncrementalHydration(),
    ),
    provideAnimations(),
    CookieService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: BrowserHttpInterceptor,
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      // Language from the URL prefix (also during SSR); `/` falls back to the eshop_lang cookie
      useFactory: (translateService: TranslateService, location: PlatformLocation) => () =>
        translateService.use(languageFromUrl(location.pathname) ?? ''),
      deps: [TranslateService, PlatformLocation],
      multi: true,
    },
    {
      provide: WindowService,
      useFactory: WindowFactory,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (envConfigService: EnvConfigurationService) => () => envConfigService.load().toPromise(),
      deps: [EnvConfigurationService],
      multi: true,
    },
  ],
};

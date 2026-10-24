import { isPlatformBrowser, PlatformLocation } from '@angular/common';
import { languageFromUrl } from './utils/language-url';
import { APP_INITIALIZER, ApplicationConfig, inject, PLATFORM_ID, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions, withNoIncrementalHydration } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch } from '@angular/common/http';
import { TranslateService } from './services/translate.service';
import { WindowService } from './services/window.service';
import { EnvConfigurationService } from './services/env-configuration.service';
import { BrowserHttpInterceptor } from './services/browser-http-interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { IMAGE_LOADER } from '@angular/common';
import { shopImageLoader } from './services/image-loader';
import { logBuildInfo } from './build-info';

export function WindowFactory() {
  return typeof window !== 'undefined' ? window : {};
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZonelessChangeDetection(),
    // NgOptimizedImage: resized Cloudinary images with srcset (services/image-loader.ts)
    { provide: IMAGE_LOADER, useValue: shopImageLoader },
    provideHttpClient(withFetch()),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: true,
        includeRequestsWithAuthHeaders: true,
      }),
      withNoIncrementalHydration(),
      // Clicks and typing before hydration finishes are replayed instead of lost
      withEventReplay(),
    ),
    // Loaded on the first animation, not with the initial bundle
    provideAnimationsAsync(),
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
    // "Eshop v1.0.0 · a1b2c3d · 2026-10-24" in the browser console, once per page load (not in SSR)
    provideAppInitializer(() => {
      if (isPlatformBrowser(inject(PLATFORM_ID))) logBuildInfo();
    }),
  ],
};

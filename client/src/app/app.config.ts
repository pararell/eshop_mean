import { APP_INITIALIZER, ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { routes } from './app.routes';
import { provideClientHydration, withHttpTransferCacheOptions, } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch } from '@angular/common/http';
import { TranslateService } from './services/translate.service';
import { WindowService } from './services/window.service';
import { EnvConfigurationService } from './services/env-configuration.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from './../environments/environment';
import { BrowserHttpInterceptor } from './services/browser-http-interceptor';


export function WindowFactory() {
  return typeof window !== 'undefined' ? window : {};
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideExperimentalZonelessChangeDetection(),
    provideHttpClient(withFetch()),
     provideClientHydration(withHttpTransferCacheOptions({
       includePostRequests: true,
       includeRequestsWithAuthHeaders: true
     })),
     provideAnimations(),
     provideServiceWorker( 'ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerWhenStable:10000' }),
     CookieService,
     {
      provide: HTTP_INTERCEPTORS,
      useClass: BrowserHttpInterceptor,
      multi: true,
    },
     {
      provide: APP_INITIALIZER,
      useFactory: (translateService: TranslateService) => () => translateService.use(''),
      deps: [TranslateService],
      multi: true
    },
    {
      provide: WindowService,
      useFactory: (WindowFactory)
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (envConfigService: EnvConfigurationService) => () => envConfigService.load().toPromise(),
      deps: [EnvConfigurationService],
      multi: true
    },
    ]
};

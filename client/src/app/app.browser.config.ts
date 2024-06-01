import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from './../environments/environment';


export function WindowFactory() {
  return typeof window !== 'undefined' ? window : {};
}

export const browserConfig: ApplicationConfig = {
  providers: [
     provideAnimations(),
     provideServiceWorker( 'ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerWhenStable:10000' }),
    ]
};

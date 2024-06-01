import { ApplicationConfig } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from './../environments/environment';


export const browserConfig: ApplicationConfig = {
  providers: [
     provideServiceWorker( 'ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerWhenStable:10000' }),
    ]
};

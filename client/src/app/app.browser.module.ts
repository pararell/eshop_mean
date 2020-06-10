import { AppModule } from './app.module';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { WindowService } from './services/window.service';
import { BrowserHttpInterceptor } from './services/browser-http-interceptor';
import { EnvConfigurationService } from './services/env-configuration.service';


export function WindowFactory() {
  return typeof window !== 'undefined' ? window : {};
}

@NgModule({
  imports: [
    AppModule,
    BrowserAnimationsModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: BrowserHttpInterceptor,
      multi: true,
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

    { provide: 'ORIGIN_URL', useValue: location.origin },
  ],
  bootstrap: [AppComponent]
})
export class AppBrowserModule { }

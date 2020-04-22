import { AppModule } from './app.module';
import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent } from './app.component';
import { WindowService } from './services/window.service';
import { BrowserHttpInterceptor } from './services/browser-http-interceptor';


export function WindowFactory() {
  return typeof window !== 'undefined' ? window : {};
}

@NgModule({
  imports: [
    AppModule
  ],
  providers: [
    {
        provide: HTTP_INTERCEPTORS,
        useClass: BrowserHttpInterceptor,
        multi: true,
    },
    {
      provide    : WindowService,
      useFactory : (WindowFactory)
    }
  ],
  bootstrap: [AppComponent]
})
export class AppBrowserModule { }

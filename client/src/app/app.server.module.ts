import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { ServerHttpInterceptor } from './services/server-http-interceptor';



@NgModule({
  imports: [
    AppModule,
    ServerModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ServerHttpInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]

})
export class AppServerModule { }

import {NgModule} from '@angular/core';
import {ServerModule, ServerTransferStateModule} from '@angular/platform-server';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {AppModule} from './app.module';
import {AppComponent} from './app.component';
import { ServerHttpInterceptor } from './services/server-http-interceptor';


@NgModule({
  imports: [
    // The AppServerModule should import your AppModule followed
    // by the ServerModule from @angular/platform-server.
    AppModule,
    ServerModule,
    ServerTransferStateModule
],
  providers: [
    {
    provide: HTTP_INTERCEPTORS,
    useClass: ServerHttpInterceptor,
    multi: true
    }
  ],
  // Since the bootstrapped component is not inherited from your
  // imported AppModule, it needs to be repeated here.
  bootstrap: [AppComponent],
})
export class AppServerModule { }

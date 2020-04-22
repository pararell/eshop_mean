import { OrderComponent } from './order/order.component';
import { routesAll } from './app.routes';
import { Routes } from '@angular/router';
// angular
import { BrowserModule, BrowserTransferStateModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';

// universal
import { TransferHttpCacheModule } from '@nguniversal/common';

// app imports
import { AppComponent } from './app.component';
import { ProductsComponent } from './products/products.component';
import { OrdersComponent } from './orders/orders.component';
import { SharedModule } from './shared/shared.module';
import { PipeModule } from './pipes/pipe.module';
import { LazyModule } from './utils/lazyLoadImg/lazy.module';
import { reducers } from './store/reducers/index';
import { AppEffects } from './store/effects';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';


// external
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';
import { TranslateService } from './services/translate.service';
import { CookieService } from 'ngx-cookie-service';

export function WindowFactory() {
  return typeof window !== 'undefined' ? window : {};
}

export function setupTranslateFactory(
  translateService: TranslateService) {
    return () => translateService.use('');
  }

const routes: Routes = routesAll;

@NgModule({
  declarations: [
    AppComponent,
    ProductsComponent,
    OrderComponent,
    OrdersComponent,
    HeaderComponent,
    FooterComponent
  ],
  imports: [
    BrowserTransferStateModule,
    BrowserModule.withServerTransition({appId: 'eshop'}),
    StoreModule.forRoot( reducers ),
    HttpClientModule,
    SharedModule,
    PipeModule,
    LazyModule,
    ReactiveFormsModule,
    FormsModule,
    TransferHttpCacheModule,
    EffectsModule.forRoot([ AppEffects ]),
    RouterModule.forRoot(routes, { initialNavigation: 'enabled' }),
    environment.production ? ServiceWorkerModule.register('ngsw-worker.js') : [],
    StoreDevtoolsModule.instrument()
  ],
  providers: [
    CookieService,
    {
      provide: APP_INITIALIZER,
      useFactory: setupTranslateFactory,
      deps: [ TranslateService ],
      multi: true
    }
  ]
})
export class AppModule { }

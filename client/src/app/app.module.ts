import { Routes } from '@angular/router';
import { BrowserModule, BrowserTransferStateModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';
import { TransferHttpCacheModule } from '@nguniversal/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { CookieService } from 'ngx-cookie-service';

import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';

import { AppComponent } from './app.component';
import { ProductsComponent } from './components/products/products.component';
import { SharedModule } from './shared/shared.module';
import { PipeModule } from './pipes/pipe.module';
import { reducers } from './store/reducers/index';
import { AppEffects } from './store/effects';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { routesAll } from './app.routes';
import { environment } from '../environments/environment';
import { TranslateService } from './services/translate.service';
import { EnvConfigurationService } from './services/env-configuration.service';



const routes: Routes = routesAll;

@NgModule({
  declarations: [
    AppComponent,
    ProductsComponent,
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
    ReactiveFormsModule,
    FormsModule,
    TransferHttpCacheModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    MatAutocompleteModule,
    MatInputModule,
    MatProgressBarModule,
    MatSidenavModule,
    EffectsModule.forRoot([ AppEffects ]),
    RouterModule.forRoot(routes, { initialNavigation: 'enabled' }),
    environment.production ? ServiceWorkerModule.register('ngsw-worker.js') : [],
    !environment.production ? StoreDevtoolsModule.instrument() : []
  ],
  providers: [
    CookieService,
    {
      provide: APP_INITIALIZER,
      useFactory: (translateService: TranslateService) => () => translateService.use(''),
      deps: [ TranslateService ],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (envConfigService: EnvConfigurationService) => () => envConfigService.load().toPromise(),
      deps: [EnvConfigurationService],
      multi: true
    }
  ]
})
export class AppModule { }

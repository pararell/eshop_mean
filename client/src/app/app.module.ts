import { CategoriesListComponent } from './shared/categories-list/categories-list.component';
import { Routes, provideRouter } from '@angular/router';
import { BrowserModule, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, provideHttpClient, withFetch } from '@angular/common/http';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SharedModule } from './shared/shared.module';
import { PipeModule } from './pipes/pipe.module';
import { reducers, metaReducers } from './store/reducers/index';
import { AppEffects } from './store/effects';
import { routesAll } from './app.routes';
import { environment } from '../environments/environment';
import { TranslateService } from './services/translate.service';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from './components/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import {provideClientHydration} from '@angular/platform-browser';
import { CarouselComponent } from './shared/carousel/carousel.component';


const routes: Routes = routesAll;

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    HeaderComponent,
    FooterComponent,
    NotFoundComponent
  ],
  imports: [
    BrowserModule,
    StoreModule.forRoot(reducers, { metaReducers }),
    HttpClientModule,
    SharedModule,
    PipeModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    MatAutocompleteModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    CarouselComponent,
    CategoriesListComponent,
    EffectsModule.forRoot([AppEffects]),
    RouterModule.forRoot(routes, { initialNavigation: 'enabledBlocking' }),
    !environment.production ? StoreDevtoolsModule.instrument() : []
  ],
  providers: [
     provideHttpClient(withFetch()),
      provideClientHydration(withHttpTransferCacheOptions({
        includePostRequests: true
      })),
    CookieService,
    {
      provide: APP_INITIALIZER,
      useFactory: (translateService: TranslateService) => () => translateService.use(''),
      deps: [TranslateService],
      multi: true
    }
  ]
})
export class AppModule { }

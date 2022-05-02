import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EditorModule } from '@tinymce/tinymce-angular';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { ProductsEditComponent } from './products-edit/products-edit.component';
import { OrdersEditComponent } from './orders-edit/orders-edit.component';
import { OrderEditComponent } from './orders-edit/order-edit/order-edit.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { TinyEditorComponent } from './tiny-editor.ts/tiny-editor.component';
import { PipeModule } from '../../pipes/pipe.module';
import { TranslationsEditComponent } from './translations-edit/translations-edit.component';
import { AllProductsComponent } from './all-products/all-products.component';
import { PagesEditComponent } from './pages-edit/pages-edit.component';
import { ThemeEditComponent } from './theme-edit/theme-edit.component';
import { CategoriesEditComponent } from './categories-edit/categories-edit.component';
import { ConfigEditComponent } from './config-edit/config-edit.component';
import { OrderComponentsModule } from '../order/components/order-components.module';


const DASHBOARD_ROUTER: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'orders',
    component: OrdersEditComponent
  },
  {
    path: 'translations',
    component: TranslationsEditComponent
  },
  {
    path: 'orders/:id',
    component: OrderEditComponent
  }
]

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    OrderComponentsModule,
    FormsModule,
    ReactiveFormsModule,
    PipeModule,
    RouterModule.forChild(DASHBOARD_ROUTER),
    EditorModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatProgressBarModule,
    MatTabsModule,
    MatRadioModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatChipsModule
  ],
  declarations: [
    ProductsEditComponent,
    CategoriesEditComponent,
    OrdersEditComponent,
    OrderEditComponent,
    AllProductsComponent,
    DashboardComponent,
    TinyEditorComponent,
    TranslationsEditComponent,
    PagesEditComponent,
    ThemeEditComponent,
    ConfigEditComponent
  ]
})
export class DashboardModule { }

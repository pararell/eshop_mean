import { PipeModule } from './../pipes/pipe.module';
import { TranslationsEditComponent } from './translations-edit/translations-edit.component';
import { NgModule } from '@angular/core';
import { Routes , RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductsEditComponent } from './products-edit/products-edit.component';
import { OrdersEditComponent } from './orders-edit/orders-edit.component';
import { OrderEditComponent } from './orders-edit/order-edit/order-edit.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from './../shared/shared.module';
import { TinyEditorComponent } from './tiny-editor.ts/tiny-editor.component';
import { FileUploadModule } from 'ng2-file-upload';
import { EditorModule } from '@tinymce/tinymce-angular';

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
    FormsModule,
    ReactiveFormsModule,
    FileUploadModule,
    PipeModule,
    RouterModule.forChild(DASHBOARD_ROUTER),
    EditorModule
  ],
  declarations: [ProductsEditComponent, OrdersEditComponent, OrderEditComponent, DashboardComponent, TinyEditorComponent, TranslationsEditComponent]
})
export class DashboardModule { }

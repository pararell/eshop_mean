import { CanDeactivateFn, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OrdersEditComponent } from './orders-edit/orders-edit.component';
import { OrderEditComponent } from './orders-edit/order-edit/order-edit.component';
import { TranslationsEditComponent } from './translations-edit/translations-edit.component';
import { ProductEditorComponent } from './product-editor/product-editor.component';

/** Asks before leaving the product editor with unsaved changes */
export const unsavedProductGuard: CanDeactivateFn<ProductEditorComponent> = (editor) =>
  !editor.hasUnsavedChanges() || confirm('You have unsaved changes. Leave without saving?');

export const DASHBOARD_ROUTES: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'products/new', component: ProductEditorComponent, canDeactivate: [unsavedProductGuard], title: 'New product' },
  { path: 'products/:titleUrl', component: ProductEditorComponent, canDeactivate: [unsavedProductGuard], title: 'Edit product' },
  { path: 'orders', component: OrdersEditComponent },
  { path: 'translations', component: TranslationsEditComponent },
  { path: 'orders/:id', component: OrderEditComponent },
];

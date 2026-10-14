import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OrdersEditComponent } from './orders-edit/orders-edit.component';
import { OrderEditComponent } from './orders-edit/order-edit/order-edit.component';
import { TranslationsEditComponent } from './translations-edit/translations-edit.component';

export const DASHBOARD_ROUTES: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'orders', component: OrdersEditComponent },
  { path: 'translations', component: TranslationsEditComponent },
  { path: 'orders/:id', component: OrderEditComponent },
];

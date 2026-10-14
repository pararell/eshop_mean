import { Routes } from '@angular/router';
import { OrdersComponent } from './orders.component';
import { OrderComponent } from './order/order.component';

export const ORDER_ROUTES: Routes = [
  { path: ':id', component: OrderComponent },
  { path: '', component: OrdersComponent },
];

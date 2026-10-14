import { Routes } from '@angular/router';
import { CartComponent } from './cart/cart.component';
import { SummaryComponent } from './summary/summary.component';

export const CART_ROUTES: Routes = [
  { path: '', component: CartComponent },
  { path: 'summary', component: SummaryComponent },
];

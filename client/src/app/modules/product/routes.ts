import { Routes } from '@angular/router';
import { ProductComponent } from './product/product.component';
import { ProductsComponent } from './products/products.component';

export const PRODUCT_ROUTES: Routes = [
  { path: 'all', component: ProductsComponent },
  { path: 'category/:category', component: ProductsComponent },
  { path: ':id', component: ProductComponent },
];

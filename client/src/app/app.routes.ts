import { AuthGuardAdmin } from './services/auth-admin.guard';
import { AuthGuard } from './services/auth.guard';
import { ProductsComponent } from './components/products/products.component';
import { JwtTokenComponent } from './modules/auth/jwtToken/jwtToken.component';
import { languages } from './shared/constants';

const langRoutes = languages.map(lang => {
  return [
   { path: lang + '/products', component: ProductsComponent },
   { path: lang + '/product', loadChildren: () => import('./modules/product/product.module').then(m => m.ProductModule) },
   { path: lang + '/cart', loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule) },
   { path: lang + '/category/:category', component: ProductsComponent },
   { path: lang + '/dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule), canLoad: [AuthGuardAdmin] },
   { path: lang + '/orders', loadChildren: () => import('./modules/order/order.module').then(m => m.OrderModule), canActivate: [AuthGuard] },
   { path: lang + '/eshop', loadChildren: () => import('./modules/eshop/eshop.module').then(m => m.EshopModule) },
   { path: lang + '/authorize', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
  ]
});

export const routesAll = [
  { path: '', component: ProductsComponent, pathMatch: 'full' },
  { path: 'jwtToken/:accessToken', component: JwtTokenComponent },
  ...[].concat(...langRoutes),
  { path: '**', redirectTo: '' }
];

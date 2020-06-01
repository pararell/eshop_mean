import { AuthGuardAdmin } from './services/auth-admin.guard';
import { AuthGuard } from './services/auth.guard';
import { JwtTokenComponent } from './modules/auth/jwtToken/jwtToken.component';
import { languages } from './shared/constants';
import { HomeComponent } from './components/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

const langRoutes = languages.map(lang => {
  return [
   { path: lang + '/product', loadChildren: () => import('./modules/product/product.module').then(m => m.ProductModule) },
   { path: lang + '/cart', loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule) },
   { path: lang + '/dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule), canLoad: [AuthGuardAdmin] },
   { path: lang + '/orders', loadChildren: () => import('./modules/order/order.module').then(m => m.OrderModule), canActivate: [AuthGuard] },
   { path: lang + '/eshop', loadChildren: () => import('./modules/eshop/eshop.module').then(m => m.EshopModule) },
   { path: lang + '/authorize', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
  ]
});

export const routesAll = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'jwtToken/:accessToken', component: JwtTokenComponent },
  { path: '404', component: NotFoundComponent },
  ...[].concat(...langRoutes),
  { path: '**', redirectTo: '404' }
];

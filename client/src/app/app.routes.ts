import { Routes } from '@angular/router';



import { languages } from './shared/constants';
import { HomeComponent } from './components/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { AuthGuard, AdminGuard } from './services/auth.guard';

const langRoutes = languages.map(lang => {
  return [
    { path: lang + '/product', loadChildren: () => import('./modules/product/product.module').then(m => m.ProductModule) },
    { path: lang + '/cart', loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule) },
    { path: lang + '/orders', loadChildren: () => import('./modules/order/order.module').then(m => m.OrderModule),canActivate: [AuthGuard] },
    { path: lang + '/dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule), canActivate: [AdminGuard] },
    { path: lang + '/eshop', loadChildren: () => import('./components/eshop/routes').then(m => m.ESHOP_ROUTER) },
    { path: lang + '/authorize', loadChildren: () => import('./components/auth/routes').then(m => m.AUTH_ROUTER) },
  ]
});

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: '404', component: NotFoundComponent },
  ...[].concat(...langRoutes),
  { path: 'jwtToken/:accessToken', loadComponent: () => import('./components/auth/jwtToken/jwtToken.component').then(mod => mod.JwtTokenComponent)},
  { path: '**', redirectTo: '404' }
];

import { Routes } from '@angular/router';

import { languages } from './shared/constants';
import { HomeComponent } from './components/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { AuthGuard, AdminGuard } from './services/auth.guard';
import { languageGuard } from './services/language.guard';

const langRoutes = languages.map((lang) => {
  return [
    { path: lang + '/product', loadChildren: () => import('./modules/product/routes').then((m) => m.PRODUCT_ROUTES), canActivate: [languageGuard] },
    { path: lang + '/cart', loadChildren: () => import('./modules/cart/routes').then((m) => m.CART_ROUTES), canActivate: [languageGuard] },
    {
      path: lang + '/orders',
      loadChildren: () => import('./modules/order/routes').then((m) => m.ORDER_ROUTES),
      canActivate: [languageGuard, AuthGuard],
    },
    {
      path: lang + '/dashboard',
      loadChildren: () => import('./modules/dashboard/routes').then((m) => m.DASHBOARD_ROUTES),
      canActivate: [languageGuard, AdminGuard],
    },
    { path: lang + '/eshop', loadChildren: () => import('./components/eshop/routes').then((m) => m.ESHOP_ROUTER), canActivate: [languageGuard] },
    { path: lang + '/authorize', loadChildren: () => import('./components/auth/routes').then((m) => m.AUTH_ROUTER), canActivate: [languageGuard] },
  ];
});

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: '404', component: NotFoundComponent },
  ...([] as Routes).concat(...langRoutes),
  {
    path: 'jwtToken/:accessToken',
    loadComponent: () => import('./components/auth/jwtToken/jwtToken.component').then((mod) => mod.JwtTokenComponent),
  },
  { path: '**', redirectTo: '404' },
];

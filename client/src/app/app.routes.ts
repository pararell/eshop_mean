import { AuthGuardAdmin } from './services/auth-admin.guard';
import { AuthGuard } from './services/auth.guard';
import { ProductsComponent } from './components/products/products.component';
import { JwtTokenComponent } from './modules/auth/jwtToken/jwtToken.component';

export const routesAll = [
  { path: '', component: ProductsComponent, pathMatch: 'full' },
  { path: 'en/products', component: ProductsComponent },
  { path: 'en/product', loadChildren: () => import('./modules/product/product.module').then(m => m.ProductModule) },
  { path: 'en/cart', loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule) },
  { path: 'en/category/:category', component: ProductsComponent },
  { path: 'en/dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule), canLoad: [AuthGuardAdmin] },
  { path: 'en/orders', loadChildren: () => import('./modules/order/order.module').then(m => m.OrderModule), canActivate: [AuthGuard] },
  { path: 'en/eshop', loadChildren: () => import('./modules/eshop/eshop.module').then(m => m.EshopModule) },
  { path: 'en/authorize', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
  { path: 'jwtToken/:accessToken', component: JwtTokenComponent },

  { path: 'sk/produkty', component: ProductsComponent  },
  { path: 'sk/produkt', loadChildren: () => import('./modules/product/product.module').then(m => m.ProductModule) },
  { path: 'sk/kosik', loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule) },
  { path: 'sk/kategoria/:category', component: ProductsComponent },
  { path: 'sk/dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule), canLoad: [AuthGuardAdmin] },
  { path: 'sk/objednavky', loadChildren: () => import('./modules/order/order.module').then(m => m.OrderModule), canActivate: [AuthGuard]},
  { path: 'sk/eshop', loadChildren: () => import('./modules/eshop/eshop.module').then(m => m.EshopModule) },
  { path: 'sk/authorize', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
  { path: 'jwtToken/:accessToken', component: JwtTokenComponent },

  { path: 'cs/produkty', component: ProductsComponent  },
  { path: 'cs/produkt', loadChildren: () => import('./modules/product/product.module').then(m => m.ProductModule) },
  { path: 'cs/kosik', loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule) },
  { path: 'cs/kategorie/:category', component: ProductsComponent },
  { path: 'cs/dashboard', loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule), canLoad: [AuthGuardAdmin] },
  { path: 'cs/objednavky', loadChildren: () => import('./modules/order/order.module').then(m => m.OrderModule), canActivate: [AuthGuard]},
  { path: 'cs/eshop', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
  { path: 'cs/authorize', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
  { path: 'jwtToken/:accessToken', component: JwtTokenComponent },

  { path: '**', redirectTo: '' }
];

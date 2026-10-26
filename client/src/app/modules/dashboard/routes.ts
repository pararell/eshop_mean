import { CanDeactivateFn, Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell/admin-shell.component';
import type { AdminRouteData } from './admin-shell/admin-nav';
import { AdminProductsComponent } from './admin-products/admin-products.component';
import { CategoriesEditComponent } from './categories-edit/categories-edit.component';
import { ConfigEditComponent } from './config-edit/config-edit.component';
import { OrdersEditComponent } from './orders-edit/orders-edit.component';
import { OrderEditComponent } from './orders-edit/order-edit/order-edit.component';
import { PagesEditComponent } from './pages-edit/pages-edit.component';
import { ProductEditorComponent } from './product-editor/product-editor.component';
import { ThemeEditComponent } from './theme-edit/theme-edit.component';
import { TranslationsEditComponent } from './translations-edit/translations-edit.component';

/** Asks before leaving the product editor with unsaved changes */
export const unsavedProductGuard: CanDeactivateFn<ProductEditorComponent> = (editor) =>
  !editor.hasUnsavedChanges() || confirm('You have unsaved changes. Leave without saving?');

const page = (data: AdminRouteData) => data;
const products = { label: 'Products', path: 'products' };
const orders = { label: 'Orders', path: 'orders' };

/** /:lang/dashboard/… : every admin page inside the shell (sidebar, top bar, breadcrumbs) */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      // The admin used to be one page with tabs; its URL opens the product list
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      { path: 'products', component: AdminProductsComponent, title: 'Products', data: page({ title: 'Products', group: 'Catalog' }) },
      {
        path: 'products/new',
        component: ProductEditorComponent,
        canDeactivate: [unsavedProductGuard],
        title: 'New product',
        data: page({ title: 'New product', group: 'Catalog', parent: products }),
      },
      {
        path: 'products/:titleUrl',
        component: ProductEditorComponent,
        canDeactivate: [unsavedProductGuard],
        title: 'Edit product',
        data: page({ title: 'Edit product', group: 'Catalog', parent: products }),
      },
      { path: 'categories', component: CategoriesEditComponent, title: 'Categories', data: page({ title: 'Categories', group: 'Catalog' }) },
      { path: 'orders', component: OrdersEditComponent, title: 'Orders', data: page({ title: 'Orders', group: 'Sales' }) },
      {
        path: 'orders/:id',
        component: OrderEditComponent,
        title: 'Order',
        data: page({ title: 'Order', group: 'Sales', parent: orders }),
      },
      { path: 'pages', component: PagesEditComponent, title: 'Pages', data: page({ title: 'Pages', group: 'Content' }) },
      { path: 'translations', component: TranslationsEditComponent, title: 'Translations', data: page({ title: 'Translations', group: 'Content' }) },
      { path: 'themes', component: ThemeEditComponent, title: 'Themes', data: page({ title: 'Themes', group: 'Appearance' }) },
      { path: 'config', component: ConfigEditComponent, title: 'Shop config', data: page({ title: 'Shop config', group: 'Settings' }) },
    ],
  },
];

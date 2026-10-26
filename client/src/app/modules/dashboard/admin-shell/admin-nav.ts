import type { IconName } from '../../../shared/components/icon/icon.component';

/** One admin page in the sidebar; `path` is relative to /:lang/dashboard */
export interface AdminNavItem {
  label: string;
  path: string;
  icon: IconName;
}

export interface AdminNavGroup {
  /** Shown above the items; none for top-level entries */
  label?: string;
  items: AdminNavItem[];
}

/**
 * The admin sidebar. Overview, Customers and AI usage join here when their pages exist
 * (admin redesign steps 4 and 5).
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: 'Catalog',
    items: [
      { label: 'Products', path: 'products', icon: 'box' },
      { label: 'Categories', path: 'categories', icon: 'tag' },
    ],
  },
  { label: 'Sales', items: [{ label: 'Orders', path: 'orders', icon: 'orders' }] },
  {
    label: 'Content',
    items: [
      { label: 'Pages', path: 'pages', icon: 'file' },
      { label: 'Translations', path: 'translations', icon: 'globe' },
    ],
  },
  { label: 'Appearance', items: [{ label: 'Themes', path: 'themes', icon: 'palette' }] },
  { label: 'Settings', items: [{ label: 'Shop config', path: 'config', icon: 'settings' }] },
];

/** Route data of an admin page: breadcrumbs and the browser tab title come from it (pages render their own header) */
export interface AdminRouteData {
  /** Page title (breadcrumb and h1) */
  title: string;
  /** Sidebar group, first breadcrumb */
  group?: string;
  /** Parent page for detail views (breadcrumb link), relative to /:lang/dashboard */
  parent?: { label: string; path: string };
}

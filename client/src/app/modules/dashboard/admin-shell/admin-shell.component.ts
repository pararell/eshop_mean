import { ChangeDetectionStrategy, Component, DOCUMENT, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { filter, map, startWith } from 'rxjs';

import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ThemeService } from '../../../services/theme.service';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { accessTokenKey, languages } from '../../../shared/constants';
import { replaceUrlLanguage } from '../../../utils/language-url';
import { buildLabel } from '../../../build-info';
import { ADMIN_NAV, AdminRouteData } from './admin-nav';

const COLLAPSED_KEY = 'eshop_admin_nav_collapsed';

/**
 * The admin frame: grouped sidebar (collapsible, remembered per browser; off-canvas on narrow
 * screens), top bar with breadcrumbs, product search and the user menu, and the page header taken
 * from the route data. Pages render inside it through child routes (routes.ts).
 */
@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss', './admin-shell-frame.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, MatMenu, MatMenuItem, MatMenuTrigger],
  host: {
    '[class.rail]': 'rail()',
    '[class.nav-open]': 'navOpen()',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class AdminShellComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private document = inject(DOCUMENT);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  readonly theme = inject(ThemeService);

  readonly nav = ADMIN_NAV;
  readonly languages = languages;
  readonly version = buildLabel();
  readonly lang = this.selectors.appLang;
  readonly user = this.selectors.user;

  /** Icons only (desktop); remembered in this browser */
  readonly collapsed = signal(this.readCollapsed());
  /** Off-canvas sidebar on narrow screens */
  readonly navOpen = signal(false);
  /** Tablet width: the sidebar is always the icon rail (phones get the off-canvas sidebar) */
  private readonly tablet = signal(false);
  private readonly phone = signal(false);
  readonly rail = computed(() => !this.phone() && (this.collapsed() || this.tablet()));

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Data of the deepest active admin route (title, group, parent) */
  readonly page = computed(() => {
    this.url();
    let snapshot: ActivatedRouteSnapshot = this.route.snapshot;
    while (snapshot.firstChild) snapshot = snapshot.firstChild;
    return { data: snapshot.data as Partial<AdminRouteData>, params: snapshot.params as Record<string, string> };
  });

  readonly crumbs = computed(() => {
    const { data, params } = this.page();
    const crumbs: { label: string; link?: string[] }[] = [];
    if (data.group) crumbs.push({ label: data.group });
    if (data.parent) crumbs.push({ label: data.parent.label, link: this.link(data.parent.path) });
    const detail = params['titleUrl'] ?? params['id'];
    if (data.title) crumbs.push({ label: detail && data.parent ? detail : data.title });
    return crumbs;
  });

  constructor() {
    if (this.browser && typeof matchMedia === 'function') {
      const watch = (query: string, target: typeof this.tablet) => {
        const media = matchMedia(query);
        target.set(media.matches);
        media.addEventListener('change', (event) => target.set(event.matches));
      };
      watch('(width <= 1100px)', this.tablet);
      watch('(width <= 720px)', this.phone);
    }
    // Close the off-canvas menu after navigating
    effect(() => {
      this.url();
      this.navOpen.set(false);
    });
  }

  link(path: string): string[] {
    return ['/', this.lang(), 'dashboard', ...path.split('/').filter(Boolean)];
  }

  langUrl(lang: string): string {
    return replaceUrlLanguage(this.url(), lang);
  }

  toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    if (this.browser) {
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // storage unavailable (private mode): still works for this page view
      }
    }
  }

  search(query: string): void {
    void this.router.navigate(this.link('products'), { queryParams: { q: query.trim() || null } });
  }

  logout(): void {
    if (this.browser) localStorage.removeItem(accessTokenKey);
    this.store.storeUser(null);
    void this.router.navigateByUrl(`/${this.lang()}`);
  }

  /** `/` focuses the search (outside text fields); Escape closes the off-canvas menu */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.navOpen()) {
      this.navOpen.set(false);
      return;
    }
    const target = event.target as HTMLElement | null;
    const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      this.document.getElementById('admin-search')?.focus();
    }
  }

  private readCollapsed(): boolean {
    if (!this.browser) return false;
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  }
}

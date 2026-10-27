import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  Signal,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe, NgTemplateOutlet, UpperCasePipe, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { Observable, of } from 'rxjs';
import { debounceTime, delay, filter, map, take } from 'rxjs/operators';

import { languageFromUrl, replaceUrlLanguage } from '../../../utils/language-url';
import { TranslateService } from '../../../services/translate.service';
import { ThemeService } from '../../../services/theme.service';
import { environment } from '../../../../environments/environment';
import { languages, currencyLang, accessTokenKey } from '../../../shared/constants';
import { Cart, User, Order } from '../../../shared/models';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { IconComponent } from '../icon/icon.component';

/**
 * Minimal header. On the home page it lies transparent over the full-screen photo/video (white text,
 * menu always visible); after scrolling past the top, and on every other page, it is a plain white bar.
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.overlay]': 'overlay()' },
  imports: [
    AsyncPipe,
    UpperCasePipe,
    NgTemplateOutlet,
    TranslatePipe,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatMenuModule,
    IconComponent,
  ],
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private translate = inject(TranslateService);
  readonly theme = inject(ThemeService);

  readonly user$: Signal<User | null> = this.selectors.user;
  readonly cart$: Signal<Cart | null> = this.selectors.cart;
  readonly productTitles$: Signal<string[]> = this.selectors.productsTitles;
  readonly userOrders$: Signal<Order[] | null> = this.selectors.userOrders;
  readonly logo = this.theme.logo;
  readonly shopName = this.theme.shopName;
  readonly cartCount = computed(() => this.cart$()?.totalQty ?? 0);
  readonly cartLabel = computed(() => (this.cartCount() ? `Cart, ${this.cartCount()} items` : 'Cart'));
  /** Every category not hidden from the menu (admin setting) */
  readonly menuCategories = computed(() => this.selectors.categories().filter((category) => !category.menuHidden));

  readonly languageOptions = languages;
  readonly lang$: Observable<string> = this.translate.getLang$();
  readonly googleAuthUrl = environment.apiUrl + '/api/auth/google';
  readonly query = new FormControl<string>('', { nonNullable: true });

  readonly searchOpen = signal(false);
  private readonly scrolled = signal(false);
  private readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => isHomeUrl(event.urlAfterRedirects)),
    ),
    { initialValue: isHomeUrl(this.router.url) },
  );
  /** Transparent over the home page's photo */
  readonly overlay = computed(() => this.isHome() && !this.scrolled() && !this.searchOpen());

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    // The page scrolls inside .main-scroll-wrap (app.component), not the window
    afterNextRender(() => {
      const scroller = this.document.getElementById('main-content');
      scroller?.addEventListener('scroll', () => this.scrolled.set(scroller.scrollTop > window.innerHeight * 0.6), { passive: true });
    });
  }

  ngOnInit(): void {
    this.query.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      this.store.getProductSearch(value || 'EMPTY___QUERY');
    });
    // The navigation lists categories on every page, not only where a page loads them
    this.lang$.pipe(filter(Boolean), take(1)).subscribe((lang) => {
      if (!this.selectors.categories().length) this.store.getCategories(lang);
    });
  }

  toggleSearch(): void {
    this.searchOpen.update((open) => !open);
    if (this.searchOpen() && isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.searchInput()?.nativeElement.focus());
    }
  }

  openProduct(titleUrl: string): void {
    this.lang$.pipe(take(1)).subscribe((lang) => {
      void this.router.navigate(['/' + lang + '/product/' + titleUrl]);
      this.query.setValue('', { emitEvent: false });
      this.searchOpen.set(false);
    });
  }

  onLogout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(accessTokenKey);
    }
    this.store.storeUser(null);
  }

  scrollToTop(): void {
    of('scroll_content')
      .pipe(delay(100), take(1))
      .subscribe(() => this.store.updatePosition({ cartComponent: 0 }));
  }

  setLang(lang: string): void {
    // On a language-prefixed page the URL decides the language (see languageGuard)
    const url = this.router.url;
    if (languageFromUrl(url)) {
      void this.router.navigateByUrl(replaceUrlLanguage(url, lang));
      return;
    }
    this.store.changeLanguage({ lang, currency: currencyLang[lang] });
  }
}

/** The home page is `/` (any query string) */
function isHomeUrl(url: string): boolean {
  return url.split(/[?#]/)[0] === '/';
}

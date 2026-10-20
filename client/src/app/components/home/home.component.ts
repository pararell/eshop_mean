import { AsyncPipe, NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { map, distinctUntilChanged, filter, take, skip } from 'rxjs/operators';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  Signal,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TranslateService } from '../../services/translate.service';
import { Product, Category, Cart } from '../../shared/models';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CategoriesListComponent } from '../../shared/components/categories-list/categories-list.component';
import { ProductsListComponent } from '../../shared/components/products-list/products-list.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SignalStore } from '../../store/signal.store';
import { PaginationState, SignalStoreSelectors } from '../../store/signal.store.selectors';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [
    AsyncPipe,
    NgOptimizedImage,
    CategoriesListComponent,
    ProductsListComponent,
    IconComponent,
    RouterLink,
    MatProgressBarModule,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private meta = inject(Meta);
  private title = inject(Title);
  private translate = inject(TranslateService);
  private snackBar = inject(MatSnackBar);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private themeService = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);

  products: Signal<Product[] | null>;
  cartIds: Signal<{ [productID: string]: number }>;
  cart: Signal<Cart | null>;
  loadingProducts: Signal<boolean>;
  categories: Signal<Category[]>;
  pagination: Signal<PaginationState>;
  category: Signal<string>;
  filterPrice: Signal<number>;
  maxPrice: Signal<number | null>;
  minPrice: Signal<number | null>;
  page: Signal<number | undefined>;
  sortBy: Signal<string>;
  currency: Signal<string>;
  lang: Signal<string | undefined>;
  categoriesSub!: Subscription;
  productsSub!: Subscription;
  /** Banner media from the active theme (loaded in the browser, possibly after this page) */
  readonly video = this.themeService.video;
  readonly heroImage = this.themeService.heroImage;
  readonly heroImagePosition = this.themeService.heroImagePosition;
  /** The hero image (no theme video): the newest product */
  readonly featured = computed(() => this.products()?.find((product) => product.mainImage?.url) ?? null);
  readonly videoPlaying = signal(false);

  readonly component = 'homeComponent';

  // Optional: the video only renders when the theme has a promo video
  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoRef');

  constructor() {
    this.category = toSignal(this.route.params.pipe(map((params) => params['category'])));
    this.page = toSignal(
      this.route.queryParams.pipe(
        map((params) => params['page']),
        map((page) => parseFloat(page)),
      ),
    );
    this.sortBy = toSignal(this.route.queryParams.pipe(map((params) => params['sort'])));
    this.lang = toSignal(this.translate.getLang$().pipe(filter((lang: string) => !!lang)));
    this.cart = this.selectors.cart;
    this.maxPrice = this.selectors.maxPrice;
    this.minPrice = this.selectors.minPrice;
    this.filterPrice = this.selectors.priceFilter;
    this.loadingProducts = this.selectors.loadingProducts;
    this.products = this.selectors.products;
    this.cartIds = computed(() => {
      if (!this.cart()) {
        return {};
      }
      return this.cart()!.items && this.cart()!.items.length ? this.cart()!.items.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.qty }), {}) : {};
    });

    this.title.setTitle('Eshop Mean');
    this.meta.updateTag({ name: 'description', content: 'Angular - Node.js - Eshop application - MEAN Eshop with dashboard' });

    this.categories = this.selectors.categories;
    this.pagination = this.selectors.pagination;
    this.currency = this.selectors.currency;

    this._loadCategories();
    this._loadProducts();

    // Autoplay once the video element exists, unless the visitor prefers reduced motion;
    // the pause/play button always works
    effect(() => {
      const video = this.videoRef()?.nativeElement;
      if (!video || !isPlatformBrowser(this.platformId) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      video.muted = true; // required for autoplay in most browsers
      video.play().catch(() => this.videoPlaying.set(false));
    });
  }

  addToCart(id: string): void {
    this.store.addToCart('?id=' + id);

    this.translate
      .getTranslations$()
      .pipe(
        map((translations) =>
          translations
            ? { message: translations['ADDED_TO_CART'] || 'Added to cart', action: translations['TO_CART'] || 'To Cart' }
            : { message: 'Added to cart', action: 'To Cart' },
        ),
        take(1),
      )
      .subscribe(({ message, action }) => {
        const snackBarRef = this.snackBar.open(message, action, { duration: 3000 });
        snackBarRef
          .onAction()
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigate(['/' + this.lang() + '/cart']);
          });
      });
  }

  removeFromCart(id: string): void {
    this.store.removeFromCart('?id=' + id);
  }

  changePage(page: number): void {
    if (this.category()) {
      this.router.navigate(['/' + this.lang() + '/product/category/' + this.category()], {
        queryParams: { sort: this.sortBy() || 'newest', page: page || 1 },
      });
    } else {
      this.router.navigate(['/' + this.lang() + '/product/all'], {
        queryParams: { sort: this.sortBy() || 'newest', page: page || 1 },
      });
    }
    this.store.updatePosition({ productsComponent: 0 });
  }

  toggleVideo(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    if (video.paused) void video.play().catch(() => this.videoPlaying.set(false));
    else video.pause();
  }

  ngOnDestroy(): void {
    this.categoriesSub.unsubscribe();
    this.productsSub.unsubscribe();
  }

  private _loadCategories(): void {
    if (!this.categories()?.length) {
      this.store.getCategories(this.lang()!);
    }

    this.categoriesSub = toObservable(this.lang)
      .pipe(distinctUntilChanged(), skip(1))
      .subscribe((lang) => {
        this.store.getCategories(lang!);
      });
  }

  private _loadProducts(): void {
    this.productsSub = combineLatest([
      toObservable(this.lang).pipe(distinctUntilChanged()),
      toObservable(this.category).pipe(distinctUntilChanged()),
      toObservable(this.filterPrice).pipe(distinctUntilChanged()),
      this.route.queryParams.pipe(
        map((params) => ({ page: params['page'], sort: params['sort'] })),
        distinctUntilChanged(),
      ),
    ]).subscribe(([lang, category, filterPrice, { page, sort }]) => {
      this.store.getProducts({ lang: lang!, category, maxPrice: filterPrice, page: page || 1, sort: sort || 'newest' });
    });
  }
}

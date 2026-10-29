import { MatSnackBar } from '@angular/material/snack-bar';
import { map, distinctUntilChanged, filter, take, skip } from 'rxjs/operators';
import { Component, ChangeDetectionStrategy, OnDestroy, Signal, computed, effect, inject } from '@angular/core';
import { toSignal, toObservable, rxResource } from '@angular/core/rxjs-interop';
import { combineLatest, Subscription } from 'rxjs';
import type { LanguageCode } from '@eshop/shared';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../../services/api.service';
import { ThemeService } from '../../../services/theme.service';
import { TranslateService } from '../../../services/translate.service';
import { ALL_PRODUCTS_PAGE, listingFeatured, listingHeader, listingTiles } from '../../../shared/listing';
import { SeoService } from '../../../services/seo.service';
import { sortOptions } from '../../../shared/constants';
import { Product, Category } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { PaginationState, SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { MatDrawerContainer, MatDrawer, MatDrawerContent } from '@angular/material/sidenav';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import { CategoriesListComponent } from '../../../shared/components/categories-list/categories-list.component';
import { ProductsListComponent } from '../../../shared/components/products-list/products-list.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AsyncPipe, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDrawerContainer,
    MatDrawer,
    SidebarComponent,
    MatDrawerContent,
    MatProgressBar,
    CategoriesListComponent,
    ProductsListComponent,
    PaginationComponent,
    AsyncPipe,
    NgOptimizedImage,
    NgTemplateOutlet,
    RouterLink,
    IconComponent,
    TranslatePipe,
  ],
})
export class ProductsComponent implements OnDestroy {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private api = inject(ApiService);
  private theme = inject(ThemeService);
  private listing = computed(() => this.theme.styles().listing);

  products: Signal<Product[] | null>;
  cartIds: Signal<{ [productID: string]: number }>;
  loadingProducts: Signal<boolean>;
  categories: Signal<Category[]>;
  subCategories: Signal<Category[]>;
  pagination: Signal<PaginationState>;
  category: Signal<string>;
  categoryInfo: Signal<Category | undefined>;
  filterPrice: Signal<number>;
  maxPrice: Signal<number | null>;
  minPrice: Signal<number | null>;
  page: Signal<number | undefined>;
  sortBy: Signal<string>;
  currency: Signal<string>;
  lang: Signal<string | undefined>;
  categoriesSub!: Subscription;
  productsSub!: Subscription;
  sortOptions = sortOptions;
  sidebarOpened = false;

  readonly component = 'productsComponent';

  /** The listing settings key of this page: '*' (All products) or the category */
  private readonly pageKey = computed(() => this.category() || ALL_PRODUCTS_PAGE);
  /** Photo, title and text of the header; an empty title = the Products translation */
  readonly header = computed(() => listingHeader(this.listing(), this.categoryInfo(), this.lang() as LanguageCode, ''));
  readonly tiles = computed(() => listingTiles(this.listing(), this.pageKey(), this.lang() as LanguageCode));
  readonly tileEvery = computed(() => this.listing()?.tileEvery);

  /** The large first card, on page 1 only: the chosen product, or the newest one on sale on this page */
  private readonly featuredProduct = rxResource({
    params: () => {
      const setting = listingFeatured(this.listing(), this.pageKey());
      const lang = this.lang();
      return setting && lang && (this.page() || 1) === 1 ? { setting, lang, category: this.category() } : undefined;
    },
    stream: ({ params: { setting, lang, category } }) =>
      setting.source === 'product'
        ? this.api.getProduct(`${setting.product}?lang=${lang}`).pipe(map((product) => (product.error || !product.visibility ? null : product)))
        : this.api
            .getProducts({ lang, page: 1, sort: 'newest', category, onSale: true })
            .pipe(map((result) => (result.error ? null : (result.products[0] ?? null)))),
  });
  readonly featured = computed(() => (this.featuredProduct.hasValue() && (this.page() || 1) === 1 ? this.featuredProduct.value() : null));

  constructor() {
    this.category = toSignal(this.route.params.pipe(map((params) => params['category'])));
    this.page = toSignal(this.route.queryParams.pipe(map((params) => parseFloat(params['page']))));
    this.sortBy = toSignal(this.route.queryParams.pipe(map((params) => params['sort'])));
    this.lang = toSignal(this.translate.getLang$().pipe(filter((lang: string) => !!lang)));

    this.maxPrice = this.selectors.maxPrice;
    this.minPrice = this.selectors.minPrice;
    this.filterPrice = this.selectors.priceFilter;
    this.loadingProducts = this.selectors.loadingProducts;
    this.products = this.selectors.products;
    this.cartIds = computed(() => {
      const cart = this.selectors.cart();
      if (!cart) {
        return {};
      }
      return cart.items && cart.items.length ? cart.items.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.qty }), {}) : {};
    });

    this.categories = this.selectors.categories;
    this.pagination = this.selectors.pagination;
    this.currency = this.selectors.currency;
    this.categoryInfo = computed(() => this.categories().find((cat) => cat.titleUrl === this.category()));
    // A category page is titled and described by its category; the full list by the shop
    const seo = inject(SeoService);
    effect(() => {
      const category = this.categoryInfo();
      seo.setPage(category ? { title: category.title, description: category.description } : {});
    });
    this.subCategories = computed(() =>
      this.categories().filter((cat) => (this.categoryInfo() ? this.categoryInfo()!.subCategories!.includes(cat.titleUrl) : false)),
    );

    this._loadCategories();
    this._loadProducts();
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

  priceRange(price: number): void {
    if (this.filterPrice() !== price) {
      this.store.filterPrice(price);
    }
  }

  changeCategory(): void {
    this.store.updatePosition({ productsComponent: 0 });
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

  changeSort(sort: string): void {
    if (this.category()) {
      this.router.navigate(['/' + this.lang() + '/product/category/' + this.category()], {
        queryParams: { sort, page: this.page() || 1 },
      });
    } else {
      this.router.navigate(['/' + this.lang() + '/product/all'], { queryParams: { sort, page: this.page() || 1 } });
    }
    this.store.updatePosition({ productsComponent: 0 });
  }

  toggleSidebar() {
    this.sidebarOpened = !this.sidebarOpened;
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

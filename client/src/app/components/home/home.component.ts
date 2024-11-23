import { SidebarComponent } from './../../shared/components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { map, distinctUntilChanged, filter, take, skip, withLatestFrom } from 'rxjs/operators';
import { Component, ChangeDetectionStrategy, OnDestroy, Signal, computed } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TranslateService } from '../../services/translate.service';
import { sortOptions } from '../../shared/constants';

import { Product, Category, Pagination, Cart } from '../../shared/models';
import { CarouselComponent } from '../../shared/components/carousel/carousel.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { CategoriesListComponent } from '../../shared/components/categories-list/categories-list.component';
import { ProductContentComponent } from '../../shared/components/product-content/product-content.component';
import { ProductsListComponent } from '../../shared/components/products-list/products-list.component';
import { SignalStore } from '../../store/signal.store';
import { SignalStoreSelectors } from '../../store/signal.store.selectors';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    imports: [CommonModule, MatSidenavModule, CategoriesListComponent, CarouselComponent, ProductContentComponent, ProductsListComponent, SidebarComponent, PaginationComponent, RouterLink, MatProgressBarModule, MatProgressSpinnerModule, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnDestroy {
  products: Signal<Product[]>;
  cartIds: Signal<{ [productID: string]: number }>;
  cart: Signal<Cart>;
  loadingProducts: Signal<boolean>;
  categories: Signal<Category[]>;
  pagination: Signal<Pagination>;
  category: Signal<string>;
  filterPrice: Signal<number>;
  maxPrice: Signal<number>;
  minPrice: Signal<number>;
  page: Signal<number>;
  sortBy: Signal<string>;
  currency: Signal<string>;
  lang: Signal<string>;
  categoriesSub: Subscription;
  productsSub: Subscription;
  sortOptions = sortOptions;
  sidebarOpened = false;

  readonly component = 'homeComponent';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private meta: Meta,
    private title: Title,
    private translate: TranslateService,
    private snackBar: MatSnackBar,
    private store: SignalStore,
    private selectors: SignalStoreSelectors
  ) {
    this.category = toSignal(this.route.params.pipe(
      map((params) => params['category']),
    ));
    this.page = toSignal(this.route.queryParams.pipe(
      map((params) => params['page']),
      map((page) => parseFloat(page))
    ));
    this.sortBy = toSignal(this.route.queryParams.pipe(
      map((params) => params['sort'])
    ));
    this.lang = toSignal(this.translate.getLang$().pipe(filter((lang: string) => !!lang)));
    this.cart = this.selectors.cart;
    this.maxPrice = this.selectors.maxPrice;
    this.minPrice =  this.selectors.minPrice;
    this.filterPrice = this.selectors.priceFilter;
    this.loadingProducts =  this.selectors.loadingProducts;
    this.products =  this.selectors.products;
    this.cartIds = computed(() => {
      if (!this.cart()) {
          return {};
        }
        return this.cart().items && this.cart().items.length ? this.cart().items.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.qty }), {}) : {}
      }
    );

    this.title.setTitle('Eshop Mean');
    this.meta.updateTag({ name: 'description', content: 'Angular - Node.js - Eshop application - MEAN Eshop with dashboard' });

    this.categories = this.selectors.categories;
    this.pagination = this.selectors.pagination;
    this.currency = this.selectors.currency;

    this._loadCategories();
    this._loadProducts();
  }

  addToCart(id: string): void {
    this.store.addToCart('?id=' + id);

    this.translate.getTranslations$()
      .pipe(map(translations => translations
        ? {message: translations['ADDED_TO_CART'] || 'Added to cart', action: translations['TO_CART'] || 'To Cart'}
        : {message: 'Added to cart', action: 'To Cart'}
        ),take(1))
      .subscribe(({message, action}) => {
        let snackBarRef = this.snackBar.open(message, action, {duration: 3000});
        snackBarRef.onAction().pipe(
            take(1))
          .subscribe(() => {
            this.router.navigate(['/' + this.lang() + '/cart'])
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
        queryParams: { sort , page: this.page() || 1 },
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
      this.store.getCategories(this.lang());
    }

    this.categoriesSub = toObservable(this.lang).pipe(distinctUntilChanged(), skip(1)).subscribe((lang: string) => {
      this.store.getCategories(lang);
    });
  }

  private _loadProducts(): void {
    this.productsSub = combineLatest([
      toObservable(this.lang).pipe(distinctUntilChanged()),
      toObservable(this.category).pipe(distinctUntilChanged()),
      toObservable(this.filterPrice).pipe(distinctUntilChanged()),
      this.route.queryParams.pipe(
        map((params) => ({ page: params['page'], sort: params['sort'] })),
        distinctUntilChanged()
      ),
    ]).subscribe(([lang, category, filterPrice, { page, sort }]) => {
      this.store.getProducts({ lang, category, maxPrice: filterPrice, page: page || 1, sort: sort || 'newest' });
    });
  }
}

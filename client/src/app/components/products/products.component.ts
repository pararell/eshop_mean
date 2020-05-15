import { map, distinctUntilChanged, filter, take } from 'rxjs/operators';
import { Component, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';

import { TranslateService } from '../../services/translate.service';
import { sortOptions } from '../../shared/constants';
import * as actions from './../../store/actions'
import * as fromRoot from '../../store/reducers';
import { Product, Category, Pagination, Cart } from '../../shared/models';



@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent implements OnDestroy {

  items$                : Observable<{ products: Product[]; minPrice: number; maxPrice: number; cartIds: {[productID: string]: number} }>;
  loadingProducts$      : Observable<boolean>;
  categories$           : Observable<Category[]>;
  pagination$           : Observable<Pagination>;
  category$             : Observable<string>;
  filterPrice$          : Observable<number>;
  page$                 : Observable<number>;
  sortBy$               : Observable<string>;
  convertVal$           : Observable<number>;
  currency$             : Observable<string>;
  lang$                 : Observable<string>;
  categoriesSub         : Subscription;
  productsSub           : Subscription;
  sortOptions           = sortOptions;

  readonly component = 'productsComponent';

  constructor(
    private store     : Store<fromRoot.State>,
    private route     : ActivatedRoute,
    private router    : Router,
    private meta      : Meta,
    private title     : Title,
    private translate : TranslateService ) {

    this.category$ = route.params.pipe(map(params => params['category']), distinctUntilChanged());
    this.page$     = route.queryParams.pipe(map(params => params['page']), map(page => parseFloat(page)));
    this.sortBy$   = route.queryParams.pipe(map(params => params['sort']), map(sort => sort));
    this.lang$     = this.translate.getLang$().pipe(filter((lang: string) => !!lang));

    this.filterPrice$ = store.select(fromRoot.getPriceFilter);
    this.loadingProducts$ = store.select(fromRoot.getLoadingProducts);

    this._loadCategories();
    this._loadProducts();

    this.items$ = combineLatest(
      this.store.select(fromRoot.getProducts).pipe(filter(Boolean)),
      this.store.select(fromRoot.getCart).pipe(filter(Boolean), map((cart: Cart) => cart.items)),
      this.filterPrice$,
      (products: Array<Product>, cartItems, filterPrice) => {
        return {
          products: products
            .filter(product => product.salePrice <= filterPrice),
          minPrice: products
            .reduce((price, product) => Math.max(price, product.salePrice), 0),
          maxPrice: products
            .reduce((price, product) => Math.min(price, product.salePrice), 0),
          cartIds: (cartItems && cartItems.length)
            ? cartItems.reduce((prev, curr) => ( {...prev, [curr.id] : curr.qty } ), {} )
            : {}
        }
      }
    )

    this.title.setTitle('Products');
    this.meta.updateTag({ name: 'description', content: 'Products description' });

    this.categories$  = this.store.select(fromRoot.getCategories);
    this.pagination$  = this.store.select(fromRoot.getPagination);
    this.convertVal$  = this.store.select(fromRoot.getConvertVal);
    this.currency$    = this.store.select(fromRoot.getCurrency);
  }

  addToCart(id: string): void {
    this.store.dispatch(new actions.AddToCart('?id=' + id));
  }

  removeFromCart(id: string): void {
    this.store.dispatch(new actions.RemoveFromCart('?id=' + id));
  }

  priceRange(price: number): void {
    this.store.dispatch(new actions.FilterPrice(price));
  }

  changeCategory(): void {
      this.store.dispatch(new actions.UpdatePosition({productsComponent: 0}));
  }

  changePage(page: number): void {
    combineLatest(this.category$, this.sortBy$, this.lang$,
      (category: string, sortBy: string, lang: string) => ({category, sortBy, lang}))
      .pipe(take(1))
      .subscribe(({category, sortBy, lang}) => {
        if (category) {
          this.router.navigate(['/' + lang + '/category/' + category], { queryParams: { sort: sortBy || 'newest', page: page || 1 } });
        } else {
          this.router.navigate(['/' + lang + '/products'], { queryParams: { sort: sortBy || 'newest', page: page || 1 } });
        }
      });
      this.store.dispatch(new actions.UpdatePosition({productsComponent: 0}));
  }

  changeSort(sort: string): void {
    combineLatest(this.category$, this.page$, this.lang$,
      (category: string, page: number, lang: string) => ({category, page, lang}))
      .pipe(take(1))
      .subscribe(({category, page, lang}) => {
        if (category) {
          this.router.navigate(['/' + lang + '/category/' + category], { queryParams: { sort, page: page || 1 } });
        } else {
          this.router.navigate(['/' + lang + '/products'], { queryParams: { sort, page: page || 1 } });
        }
      });
      this.store.dispatch(new actions.UpdatePosition({productsComponent: 0}));
  }

  ngOnDestroy(): void {
    this.categoriesSub.unsubscribe();
    this.productsSub.unsubscribe();
  }

  private _loadCategories(): void {
    this.categoriesSub = this.lang$.subscribe(() => this.store.dispatch(new actions.GetCategories()));
  }

  private _loadProducts(): void {
    this.productsSub = combineLatest(
        this.lang$.pipe(distinctUntilChanged()),
        this.category$.pipe(distinctUntilChanged()),
        this.route.queryParams.pipe(
            map(params => ({page: params['page'], sort: params['sort']})),
            distinctUntilChanged()),
        (lang: string, category: string, {page, sort}) => ({lang, category, page, sort}))
      .subscribe(({lang, category, page, sort}) => {
        this.store.dispatch(new actions.GetProducts({lang, category, page: page || 1, sort: sort || 'newest' }));
    });
  }

}

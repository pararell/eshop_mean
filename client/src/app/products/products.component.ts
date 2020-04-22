import { map, distinctUntilChanged, filter, take, first } from 'rxjs/operators';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

import { TranslateService } from './../services/translate.service';

import { Store } from '@ngrx/store';
import * as actions from './../store/actions'
import * as fromRoot from '../store/reducers';



@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent {

  items$                : Observable<any>;
  loadingProducts$      : Observable<boolean>;
  categories$           : Observable<any>;
  pagination$           : Observable<any>;
  paginationCategories$ : Observable<any>;
  category$             : Observable<any>;
  filterPrice$          : Observable<number>;
  page$                 : Observable<any>;
  sortBy$               : Observable<any>;
  convertVal$           : Observable<number>;
  currency$             : Observable<string>;
  lang$                 : Observable<any>;

  sortOptions = [{
    name: 'Newest',
    id: 'newest',
  },
  {
    name: 'Oldest',
    id: 'oldest',
  },
  {
    name: 'Price-asc',
    id: 'priceasc',
  },
  {
    name: 'Price-decs',
    id: 'pricedesc',
  }];

  readonly component = 'productsComponent';

  productsUrl = '/products';
  categoryUrl = '/category';

  constructor(
    private store     : Store<fromRoot.State>,
    private route     : ActivatedRoute,
    private router    : Router,
    private _meta     : Meta,
    private _title    : Title,
    private translate : TranslateService ) {

    this.category$ = route.params.pipe(map(params => params['category']), distinctUntilChanged());
    this.page$     = route.queryParams.pipe(map(params => params['page']), map(page => parseFloat(page)));
    this.sortBy$   = route.queryParams.pipe(map(params => params['sort']), map(sort => sort));
    this.lang$     = store.select(fromRoot.getLang).pipe(filter(Boolean))

    this._setUrls();

    this.filterPrice$ = store.select(fromRoot.getPriceFilter);
    this.loadingProducts$ = store.select(fromRoot.getLoadingProducts);

    this._loadCategories();
    this._loadProducts();

    this.items$ = combineLatest(
      this.store.select(fromRoot.getProducts).pipe(filter(Boolean)),
      this.store.select(fromRoot.getCart).pipe(filter(Boolean), map((cart: any) => cart.items)),
      this.filterPrice$,
      (products:Array<any>, cartItems, filterPrice) => {
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

    this._title.setTitle('Products');
    this._meta.updateTag({ name: 'description', content: 'Bluetooth Headphones for every ears' });

    this.categories$           = this.store.select(fromRoot.getCategories).pipe(filter(Boolean));
    this.pagination$           = this.store.select(fromRoot.getPagination);
    this.paginationCategories$ = this.store.select(fromRoot.getCategoriesPagination);
    this.convertVal$           = this.store.select(fromRoot.getConvertVal);
    this.currency$             = this.store.select(fromRoot.getCurrency);

  }

  addToCart(id) {
    this.lang$.pipe(take(1))
    .subscribe(lang => {
      this.store.dispatch(new actions.AddToCart('?id=' + id + '&lang=' + lang));
    });
  }

  removeFromCart(id) {
    this.lang$.pipe(take(1))
    .subscribe(lang => {
      this.store.dispatch(new actions.RemoveFromCart('?id=' + id + '&lang=' + lang));
    });
  }

  priceRange(price) {
    this.store.dispatch(new actions.FilterPrice(price));
  }

  changeCategory(category) {
      this.store.dispatch(new actions.UpdatePosition({productsComponent: 0}));
  }

  changePage(page) {
    combineLatest(this.category$, this.sortBy$,
      (category, sortBy) => ({category, sortBy}))
      .pipe(first())
      .subscribe(({category, sortBy}) => {
        if (category) {
          this.router.navigate([this.categoryUrl + '/' + category], { queryParams: { sort: sortBy || 'newest', page: page || 1 } });
        } else {
          // this.store.dispatch(new actions.LoadProducts({page: page || 1, sort: sortBy || 'newest'}));
          this.router.navigate([this.productsUrl], { queryParams: { sort: sortBy || 'newest', page: page || 1 } });
        }
      });
      this.store.dispatch(new actions.UpdatePosition({productsComponent: 0}));
  }

  changeSort(sort: string) {
    combineLatest(this.category$, this.page$,
      (category, page) => ({category, page}))
      .pipe(first())
      .subscribe(({category, page}) => {
        if (category) {
          this.router.navigate([this.categoryUrl + '/' + category], { queryParams: { sort, page: page || 1 } });
        } else {
          // this.store.dispatch(new actions.LoadProducts({page: page || 1, sort}));
          this.router.navigate([this.productsUrl], { queryParams: { sort, page: page || 1 } });
        }
      });
      this.store.dispatch(new actions.UpdatePosition({productsComponent: 0}));
  }

  private _setUrls(): void {
    this.translate.translationsSub$
    .pipe(filter(Boolean))
    .subscribe(translations => {
      this.productsUrl = '/' + this.translate.lang + '/' + (translations['products'] || 'products');
      this.categoryUrl = '/' + this.translate.lang + '/' + (translations['category'] || 'category');
    });
  }

  private _loadCategories(): void {
    combineLatest(this.store.select(fromRoot.getCategories).pipe(
      filter(categories => !categories.length),
      take(1)),  this.lang$, (categories, lang) => ({categories, lang}))
    .subscribe(({categories, lang}) => this.store.dispatch(new actions.LoadCategories({lang})));
  }

  private _loadProducts(): void {
    combineLatest(this.lang$, this.category$, this.route.queryParams.pipe(
      map(params => ({page: params['page'], sort: params['sort']}))),
        (lang, category, {page, sort}) => ({lang, category, page, sort}))
    .subscribe(({lang, category, page, sort}) => {
      this.store.dispatch(new actions.LoadProducts({lang, category, page: page || 1, sort: sort || 'newest' }));
    });
  }

}

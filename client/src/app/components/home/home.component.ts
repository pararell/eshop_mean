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
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnDestroy {

  products$             : Observable<Product[]>;
  cartIds$             : Observable<{ [productID: string]: number }>;
  loadingProducts$      : Observable<boolean>;
  categories$           : Observable<Category[]>;
  pagination$           : Observable<Pagination>;
  category$             : Observable<string>;
  filterPrice$          : Observable<number>;
  maxPrice$             : Observable<number>;
  minPrice$             : Observable<number>;
  page$                 : Observable<number>;
  sortBy$               : Observable<string>;
  convertVal$           : Observable<number>;
  currency$             : Observable<string>;
  lang$                 : Observable<string>;
  categoriesSub         : Subscription;
  productsSub           : Subscription;
  sortOptions           = sortOptions;
  sidebarOpened         = false;

  readonly component = 'homeComponent';

  constructor(
    private store     : Store<fromRoot.State>,
    private route     : ActivatedRoute,
    private router    : Router,
    private meta      : Meta,
    private title     : Title,
    private translate : TranslateService ) {

    this.category$ = this.route.params.pipe(map(params => params['category']), distinctUntilChanged());
    this.page$     = this.route.queryParams.pipe(map(params => params['page']), map(page => parseFloat(page)));
    this.sortBy$   = this.route.queryParams.pipe(map(params => params['sort']), map(sort => sort));
    this.lang$     = this.translate.getLang$().pipe(filter((lang: string) => !!lang));

    this.maxPrice$  = this.store.select(fromRoot.getMaxPrice);
    this.minPrice$  = this.store.select(fromRoot.getMinPrice);
    this.filterPrice$ = this.store.select(fromRoot.getPriceFilter);
    this.loadingProducts$ = this.store.select(fromRoot.getLoadingProducts);
    this.products$ = this.store.select(fromRoot.getProducts).pipe(filter(products => !!products));
    this.cartIds$  = this.store.select(fromRoot.getCart).pipe(
        filter(cart => !!cart), 
        map((cart: Cart) => (cart.items && cart.items.length)
          ? cart.items.reduce((prev, curr) => ( {...prev, [curr.id] : curr.qty } ), {} )
          : {} ));

    this._loadCategories();
    this._loadProducts();

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
    this.filterPrice$.pipe(take(1)).subscribe(filterPrice => {
      if (filterPrice !== price) {
        this.store.dispatch(new actions.FilterPrice(price));
      }
    })
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
          this.router.navigate(['/' + lang + '/product/category/' + category], { queryParams: { sort: sortBy || 'newest', page: page || 1 } });
        } else {
          this.router.navigate(['/' + lang + '/product/all'], { queryParams: { sort: sortBy || 'newest', page: page || 1 } });
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
          this.router.navigate(['/' + lang + '/product/category/' + category], { queryParams: { sort, page: page || 1 } });
        } else {
          this.router.navigate(['/' + lang + '/product/all'], { queryParams: { sort, page: page || 1 } });
        }
      });
      this.store.dispatch(new actions.UpdatePosition({productsComponent: 0}));
  }

  toggleSidebar() {
    this.sidebarOpened = !this.sidebarOpened;
  }

  ngOnDestroy(): void {
    this.categoriesSub.unsubscribe();
    this.productsSub.unsubscribe();
  }

  private _loadCategories(): void {
    this.categoriesSub = this.lang$.pipe(distinctUntilChanged())
      .subscribe((lang) => {  console.log(lang); this.store.dispatch(new actions.GetCategories(lang))  });
  }

  private _loadProducts(): void {
    this.productsSub = combineLatest(
        this.lang$.pipe(distinctUntilChanged()),
        this.category$.pipe(distinctUntilChanged()),
        this.filterPrice$.pipe(distinctUntilChanged()),
        this.route.queryParams.pipe(
            map(params => ({page: params['page'], sort: params['sort']})),
            distinctUntilChanged()),
        (lang: string, category: string, filterPrice: number, {page, sort}) => ({lang, category, filterPrice, page, sort}))
      .subscribe(({lang, category, filterPrice, page, sort}) => {
        this.store.dispatch(new actions.GetProducts({lang, category, maxPrice: filterPrice, page: page || 1, sort: sort || 'newest' }));
    });
  }

}

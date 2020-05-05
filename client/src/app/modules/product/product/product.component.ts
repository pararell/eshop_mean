import { filter, map, take } from 'rxjs/operators';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { Store } from '@ngrx/store';
import { Location } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

import * as actions from '../../../store/actions';
import * as fromRoot from '../../../store/reducers';
import { Cart, Product } from 'src/app/shared/models';


@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss']
})
export class ProductComponent {

  items$          : Observable<{ product: Product; cartIds: any }>;
  productLoading$ : Observable<boolean>;
  convertVal$     : Observable<number>;
  currency$       : Observable<string>;
  lang$           : Observable<string>;
  openImages      = {};

  constructor(
    private route   : ActivatedRoute,
    private store   : Store<fromRoot.State>,
    private location: Location,
    private meta    : Meta,
    private title   : Title ) {

    this.lang$ = this.store.select(fromRoot.getLang);

    combineLatest(this.lang$, this.route.params.pipe(map(params => params['id'])), (lang, id) => ({ lang, id }))
      .subscribe(({ lang, id }) => this.store.dispatch(new actions.GetProduct(id + '?lang=' + lang)));

    this.setMetaData();
    this.productLoading$ = this.store.select(fromRoot.getProductLoading);

    this.items$ = combineLatest(
      this.store.select(fromRoot.getProduct),
      this.store.select(fromRoot.getCart).pipe(
        filter(Boolean),
        map((cart: Cart) => cart.items)
      ),
      (product, cartItems) => {
        return {
          product,
          cartIds: cartItems.reduce((prev: any, curr: any) => ({ ...prev, [curr.id]: curr.qty }), {})
        };
      }
    );

    this.convertVal$ = this.store.select(fromRoot.getConvertVal);
    this.currency$ = this.store.select(fromRoot.getCurrency);
  }

  cartEvent(id: string, lang: string, type: string): void {
    if (type === 'add') {
      this.store.dispatch(new actions.AddToCart('?id=' + id + '&lang=' + lang));
    }
    if (type === 'remove') {
      this.store.dispatch(new actions.RemoveFromCart('?id=' + id + '&lang=' + lang));
    }
  }

  goBack(): void {
    this.location.back();
  }

  toggleModalImg(index: number): void {
    this.openImages[index] = this.openImages[index] ? !this.openImages[index] : true;
  }

  prevImg(event, i: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.openImages[i] = false;
    this.openImages[i - 1] = true;
  }

  nextImg(event, i: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.openImages[i] = false;
    this.openImages[i + 1] = true;
  }

  private setMetaData(): void {
    this.store
      .select(fromRoot.getProduct)
      .pipe(
        filter((product: any) => product && product.title),
        take(1)
      )
      .subscribe(product => {
        this.title.setTitle(product.title);
        this.meta.updateTag({ name: 'description', content: product.description });
      });
  }
}

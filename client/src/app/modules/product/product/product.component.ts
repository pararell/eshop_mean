import { filter, map, take } from 'rxjs/operators';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';

import { Store } from '@ngrx/store';
import * as actions from '../../../store/actions';
import * as fromRoot from '../../../store/reducers';
import { Location } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss']
})
export class ProductComponent {

  items$          : Observable<any>;
  productLoading$ : Observable<any>;
  convertVal$     : Observable<number>;
  currency$       : Observable<string>;
  lang$           : Observable<any>;
  activeTab  = 'first';
  openImages = {};

  constructor(
    private _route  : ActivatedRoute,
    private store   : Store<fromRoot.State>,
    private location: Location,
    private _meta   : Meta,
    private _title  : Title) {
    this.lang$ = this.store.select(fromRoot.getLang).pipe(filter(Boolean));

    combineLatest(this.lang$, this._route.params.pipe(map(params => params['id'])), (lang, id) => ({ lang, id }))
      .subscribe(({ lang, id }) => this.store.dispatch(new actions.GetProduct(id + '?lang=' + lang)));

    this.store
      .select(fromRoot.getProduct)
      .pipe(
        filter(product => product && product.title),
        take(1)
      )
      .subscribe(product => {
        this._title.setTitle(product.title);
        this._meta.updateTag({ name: 'description', content: product.description });
      });

    this.productLoading$ = this.store.select(fromRoot.getProductLoading);

    this.items$ = combineLatest(
      this.store.select(fromRoot.getProduct),
      this.store.select(fromRoot.getCart).pipe(
        filter(Boolean),
        map((cart:any) => cart.items)
      ),
      (product, cartItems) => {
        return {
          product: product,
          cartIds: cartItems.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.qty }), {})
        };
      }
    );

    this.convertVal$ = this.store.select(fromRoot.getConvertVal);
    this.currency$ = this.store.select(fromRoot.getCurrency);
  }

  goBack() {
    this.location.back();
  }

  addToCart(id: string) {
    this.lang$.pipe(take(1)).subscribe(lang => {
      this.store.dispatch(new actions.AddToCart('?id=' + id + '&lang=' + lang));
    });
  }

  removeFromCart(id: string) {
    this.lang$.pipe(take(1)).subscribe(lang => {
      this.store.dispatch(new actions.RemoveFromCart('?id=' + id + '&lang=' + lang));
    });
  }

  toggleModalImg(index: number): void {
    this.openImages[index] = this.openImages[index] ? !this.openImages[index] : true;
  }

  prevImg(event, i: number) {
    event.stopPropagation();
    event.preventDefault();
    this.openImages[i] = false;
    this.openImages[i - 1] = true;
  }

  nextImg(event, i: number) {
    event.stopPropagation();
    event.preventDefault();
    this.openImages[i] = false;
    this.openImages[i + 1] = true;
  }
}

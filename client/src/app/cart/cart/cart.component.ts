import { TranslateService } from './../../services/translate.service';
import { map, filter, take } from 'rxjs/operators';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Observable, combineLatest } from 'rxjs';

import { Store } from '@ngrx/store';

import * as actions from './../../store/actions';
import * as fromRoot from '../../store/reducers';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent {
  cart$       : Observable<any>;
  lang$       : Observable<any>;
  order$      : Observable<any>;
  user$       : Observable<any>;
  orderForm   : FormGroup;
  convertVal$ : Observable<number>;
  currency$   : Observable<string>;
  toggleOrderForm = false;
  productUrl      : string;

  constructor(
    private store: Store<fromRoot.State>,
    private _fb: FormBuilder,
    private location: Location,
    private translate: TranslateService) {

    this.translate.translationsSub$.pipe(filter(Boolean)).subscribe(translations => {
      this.productUrl = '/' + this.translate.lang + '/' + (translations['product'] || 'product');
    });

    this.lang$ = this.store.select(fromRoot.getLang).pipe(filter(Boolean));

    this.cart$ = this.store.select(fromRoot.getCart);
    this.order$ = this.store.select(fromRoot.getOrder).pipe(
      filter(Boolean),
      map((order:any) => order.outcome)
    );

    this.user$ = this.store.select(fromRoot.getUser);

    this.orderForm = this._fb.group({
      name: ['', Validators.required],
      email: ['', Validators.required],
      adress: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      zip: ['', Validators.required],
      notes: ['']
    });

    this.convertVal$ = this.store.select(fromRoot.getConvertVal);
    this.currency$ = this.store.select(fromRoot.getCurrency);
  }

  goBack() {
    this.location.back();
  }

  removeFromCart(id) {
    this.lang$.pipe(take(1)).subscribe(lang => {
      this.store.dispatch(new actions.RemoveFromCart('?id=' + id + '&lang=' + lang));
    });
  }

  onToggleForm() {
    this.toggleOrderForm = !this.toggleOrderForm;
  }

  closeToggleForm() {
    this.toggleOrderForm = false;
  }

  payWithCard(payment){
    const addresses = [{
      name                : this.orderForm.value.name,
      address_city        : this.orderForm.value.city,
      address_country     : this.orderForm.value.country,
      address_line1       : this.orderForm.value.adress,
      address_line2       : '',
      address_zip         : this.orderForm.value.zip,
    }]
    const paymentRequest = {...payment, ...this.orderForm.value, addresses};
    this.store.dispatch(new actions.LoadPayment(paymentRequest));
  }

  submit() {
      const addresses = [{
        name                : this.orderForm.value.name,
        address_city        : this.orderForm.value.city,
        address_country     : this.orderForm.value.country,
        address_line1       : this.orderForm.value.adress,
        address_line2       : '',
        address_zip         : this.orderForm.value.zip,
      }];

      const orderRequest = {...this.orderForm.value, addresses};
      this.store.dispatch(new actions.MakeOrder(orderRequest));
      this.toggleOrderForm = false;
  }
}

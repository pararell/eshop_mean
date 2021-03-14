import { Router } from '@angular/router';
import { map, filter, take, withLatestFrom } from 'rxjs/operators';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';

import { TranslateService } from '../../../services/translate.service';
import * as actions from '../../../store/actions';
import * as fromRoot from '../../../store/reducers';
import { Cart, User, Order } from '../../../shared/models';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent {
  cart$       : Observable<Cart>;
  lang$       : Observable<string>;
  order$      : Observable<Order>;
  user$       : Observable<User>;
  orderForm   : FormGroup;
  currency$   : Observable<string>;
  toggleCard = false;
  productUrl  : string;
  loading$    : Observable<boolean>;
  error$      : Observable<string>;

  readonly component = 'cartComponent';

  constructor(
    private store: Store<fromRoot.State>,
    private fb: FormBuilder,
    private router: Router,
    private location: Location,
    private translate: TranslateService) {

    this.store.dispatch(new actions.CleanError());

    this.lang$ = this.translate.getLang$();
    this.cart$ = this.store.select(fromRoot.getCart);
    this.order$ = this.store.select(fromRoot.getOrder).pipe(filter(order => !!order));
    this.user$ = this.store.select(fromRoot.getUser);

    this.orderForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      zip: ['', Validators.required],
      notes: ['']
    });

    this.currency$ = this.store.select(fromRoot.getCurrency);

    this.order$.pipe(
      filter(order => !!order),
      withLatestFrom(this.lang$),
      take(1))
      .subscribe(([order, lang]) => {
        this.router.navigate(['/' + lang + '/cart/summary'])
      });
  }

  goBack(): void {
    this.location.back();
  }

  removeFromCart(id: string): void {
    this.lang$.pipe(take(1)).subscribe(lang => {
      this.store.dispatch(new actions.RemoveFromCart('?id=' + id + '&lang=' + lang));
    });
  }

  payWithCard(payment): void {
    this.user$.pipe(take(1)).subscribe((user: User) => {
      const userToOrder = user ? { userId: user.id } : {};
      const addresses = [{
        name        : this.orderForm.value.name,
        city        : this.orderForm.value.city,
        country     : this.orderForm.value.country,
        line1       : this.orderForm.value.address,
        line2       : '',
        zip         : this.orderForm.value.zip,
      }]
      const paymentRequest = {...payment, ...this.orderForm.value, ...userToOrder, addresses};
      this.store.dispatch(new actions.MakeOrderWithPayment(paymentRequest));
    })
  }

  scrollToTop(): void {
    this.store.dispatch(new actions.UpdatePosition({cartComponent: 0}));
  }

  submit(currency: string): void {
    this.user$.pipe(take(1)).subscribe((user: User) => {
      const userToOrder = user ? { userId: user.id } : {};
      const addresses = [{
        name        : this.orderForm.value.name,
        city        : this.orderForm.value.city,
        country     : this.orderForm.value.country,
        line1       : this.orderForm.value.address,
        line2       : '',
        zip         : this.orderForm.value.zip,
      }];

      const orderRequest = {...this.orderForm.value, ...userToOrder, currency, addresses};
      this.store.dispatch(new actions.MakeOrder(orderRequest));
      this.toggleCard = false;
      this.scrollToTop();
    })

  }
}

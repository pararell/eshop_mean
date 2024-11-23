import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { map, filter, take, withLatestFrom } from 'rxjs/operators';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';


import { TranslateService } from '../../../services/translate.service';
import { Cart, User, Order } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';

@Component({
    selector: 'app-cart',
    templateUrl: './cart.component.html',
    styleUrls: ['./cart.component.scss'],
    standalone: false
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
    private store: SignalStore,
    private selectors: SignalStoreSelectors,
    private fb: FormBuilder,
    private router: Router,
    private location: Location,
    private translate: TranslateService) {

    this.store.cleanError();

    this.lang$ = this.translate.getLang$();
    this.cart$ = toObservable(this.selectors.cart);
    this.order$ = toObservable(this.selectors.order).pipe(filter(order => !!order));
    this.user$ = toObservable(this.selectors.user);

    this.orderForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      zip: ['', Validators.required],
      notes: ['']
    });

    this.currency$ = toObservable(this.selectors.currency);

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
      this.store.removeFromCart('?id=' + id + '&lang=' + lang);
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
      this.store.makeOrderWithPayment(paymentRequest);
    })
  }

  scrollToTop(): void {
    this.store.updatePosition({cartComponent: 0});
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
      this.store.makeOrder(orderRequest);
      this.toggleCard = false;
      this.scrollToTop();
    })

  }
}

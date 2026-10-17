import { toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { filter, take, withLatestFrom } from 'rxjs/operators';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Location, AsyncPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';
import { Cart, User, Order } from '../../../shared/models';
import type { PaymentIntentRequest } from '@eshop/shared';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatStepper, MatStep, MatStepLabel, MatStepperNext, MatStepperPrevious } from '@angular/material/stepper';
import { MatFormField, MatLabel } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { MatIcon } from '@angular/material/icon';
import { CardComponent } from '../card/card.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { PriceFormatPipe } from '../../../pipes/price.pipe';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatProgressBar,
    RouterLink,
    MatStepper,
    MatStep,
    ReactiveFormsModule,
    MatStepLabel,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatStepperNext,
    MatRadioGroup,
    FormsModule,
    MatRadioButton,
    MatIcon,
    MatStepperPrevious,
    CardComponent,
    AsyncPipe,
    TranslatePipe,
    PriceFormatPipe,
  ],
})
export class CartComponent {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private location = inject(Location);
  private translate = inject(TranslateService);

  cart$: Observable<Cart | null>;
  lang$: Observable<string>;
  order$: Observable<Order>;
  user$: Observable<User | null>;
  orderForm: FormGroup;
  currency$: Observable<string>;
  toggleCard = false;
  productUrl!: string;
  loading$!: Observable<boolean>;
  error$!: Observable<string>;

  readonly component = 'cartComponent';

  constructor() {
    this.store.cleanError();

    this.lang$ = this.translate.getLang$();
    this.cart$ = toObservable(this.selectors.cart);
    this.order$ = toObservable(this.selectors.order).pipe(filter((order) => !!order));
    this.user$ = toObservable(this.selectors.user);

    this.orderForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required],
      zip: ['', Validators.required],
      notes: [''],
    });

    this.currency$ = toObservable(this.selectors.currency);

    this.order$
      .pipe(
        filter((order) => !!order),
        withLatestFrom(this.lang$),
        take(1),
      )
      .subscribe(([_order, lang]) => {
        this.router.navigate(['/' + lang + '/cart/summary']);
      });
  }

  goBack(): void {
    this.location.back();
  }

  removeFromCart(id: string): void {
    this.lang$.pipe(take(1)).subscribe((lang) => {
      this.store.removeFromCart('?id=' + id + '&lang=' + lang);
    });
  }

  /** Read by the card component when the customer presses Pay (amount and user come from the server) */
  readonly buildPaymentRequest = (): PaymentIntentRequest => ({
    email: this.orderForm.value.email,
    notes: this.orderForm.value.notes || undefined,
    addresses: [
      {
        name: this.orderForm.value.name,
        line1: this.orderForm.value.address,
        city: this.orderForm.value.city,
        zip: this.orderForm.value.zip,
        country: this.orderForm.value.country,
      },
    ],
  });

  /** Stripe.js confirmed the payment: load the paid order (navigates to the summary) */
  onPaid(orderId: string): void {
    this.store.completePayment(orderId);
    this.scrollToTop();
  }

  scrollToTop(): void {
    this.store.updatePosition({ cartComponent: 0 });
  }

  submit(currency: string): void {
    this.user$.pipe(take(1)).subscribe((user) => {
      const userToOrder = user ? { userId: user.id } : {};
      const addresses = [
        {
          name: this.orderForm.value.name,
          city: this.orderForm.value.city,
          country: this.orderForm.value.country,
          line1: this.orderForm.value.address,
          line2: '',
          zip: this.orderForm.value.zip,
        },
      ];

      const orderRequest = { ...this.orderForm.value, ...userToOrder, currency, addresses };
      this.store.makeOrder(orderRequest);
      this.toggleCard = false;
      this.scrollToTop();
    });
  }
}

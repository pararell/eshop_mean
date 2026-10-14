import type { Stripe as StripeClient, StripeCardElement, StripeCardElementChangeEvent, Token } from '@stripe/stripe-js';

/** Global from https://js.stripe.com/v3/ (loaded at runtime in ngOnInit) */
declare const Stripe: (publishableKey: string) => StripeClient;

/** Stripe.js v3 elements still support the legacy addEventListener alias used here */
type CardElement = StripeCardElement & {
  addEventListener(event: 'change', handler: (event: StripeCardElementChangeEvent) => void): void;
};

import { Component, PLATFORM_ID, ElementRef, OnInit, ChangeDetectionStrategy, inject, input, output, viewChild } from '@angular/core';
import { isPlatformServer, DOCUMENT, AsyncPipe } from '@angular/common';
import { take } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

import { EnvConfigurationService } from '../../../services/env-configuration.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, FormsModule, MatButton, MatProgressBar, AsyncPipe, TranslatePipe],
})
export class CardComponent implements OnInit {
  private envConfigurationService = inject(EnvConfigurationService);
  private _document = inject<Document>(DOCUMENT);
  private _platformId = inject(PLATFORM_ID);

  /** Formatted total from the cart page (a string, see audit BUG-21) */
  readonly price = input.required<string | number>();
  readonly currency = input.required<string>();
  readonly loading = input.required<boolean>();

  readonly scrollToTop = output();
  readonly payWithCardEmit = output<{ token: Token; amount: string | number; currency: string }>();
  readonly cardElement = viewChild.required<ElementRef>('cardElement');

  stripe!: StripeClient;
  card!: CardElement;
  cardErrorSub$ = new BehaviorSubject('INVALID');
  loadingPayment = false;

  ngOnInit() {
    if (!isPlatformServer(this._platformId) && typeof Stripe !== 'object') {
      const parentElement: HTMLElement = this._document.querySelector('head') as HTMLElement;
      const scriptEl = this._document.createElement('script');
      scriptEl.setAttribute('type', 'text/javascript');
      scriptEl.setAttribute('src', 'https://js.stripe.com/v3/');
      parentElement.appendChild(scriptEl);
      scriptEl.onload = (_event: Event) => {
        this._setHandler();
      };
    } else if (typeof Stripe === 'object') {
      this._setHandler();
    }
  }

  async handleForm(e: Event) {
    e.preventDefault();
    this.loadingPayment = true;

    this.stripe.createToken(this.card).then((result) => {
      if (result.error) {
        this.cardErrorSub$.next(result.error.message!);
        this.loadingPayment = false;
      } else {
        this.cardErrorSub$.next('');
        this.stripeTokenHandler(result.token);
        this.scrollToTop.emit();
        this.loadingPayment = false;
      }
    });
  }

  private stripeTokenHandler(token: Token) {
    const payment = { token: token, amount: this.price(), currency: this.currency() };
    this.payWithCardEmit.emit(payment);
  }

  private _setHandler() {
    this.envConfigurationService
      .getConfigType$('FE_STRIPE_PUBLISHABLE_KEY')
      .pipe(take(1))
      .subscribe((stripePublishableKey) => {
        this.stripe = Stripe(stripePublishableKey);
        const elements = this.stripe.elements();

        this.card = elements.create('card') as CardElement;
        this.card.mount(this.cardElement().nativeElement);

        this.card.addEventListener('change', ({ error, complete }) => {
          const cardError = error && error.message ? error.message : complete ? '' : 'INVALID';
          this.cardErrorSub$.next(cardError);
        });
      });
  }
}

import type { Stripe as StripeClient, StripeCardElement, StripeCardElementChangeEvent, Token } from '@stripe/stripe-js';

/** Global from https://js.stripe.com/v3/ (loaded at runtime in ngOnInit) */
declare const Stripe: (publishableKey: string) => StripeClient;

/** Stripe.js v3 elements still support the legacy addEventListener alias used here */
type CardElement = StripeCardElement & {
  addEventListener(event: 'change', handler: (event: StripeCardElementChangeEvent) => void): void;
};

import { Component, Input, EventEmitter, Inject, PLATFORM_ID, ViewChild, ElementRef, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformServer, DOCUMENT } from '@angular/common';
import { take } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

import { EnvConfigurationService } from '../../../services/env-configuration.service';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CardComponent implements OnInit {
  /** Formatted total from the cart page (a string, see audit BUG-21) */
  @Input() price!: string | number;
  @Input() currency!: string;
  @Input() loading!: boolean;

  @Output() scrollToTop = new EventEmitter();
  @Output() payWithCardEmit = new EventEmitter();
  @ViewChild('cardElement') cardElement!: ElementRef;

  stripe!: StripeClient;
  card!: CardElement;
  cardErrorSub$ = new BehaviorSubject('INVALID');
  loadingPayment = false;

  constructor(
    private envConfigurationService: EnvConfigurationService,
    @Inject(DOCUMENT)
    private _document: Document,
    @Inject(PLATFORM_ID)
    private _platformId: object,
  ) {}

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
    const payment = { token: token, amount: this.price, currency: this.currency };
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
        this.card.mount(this.cardElement.nativeElement);

        this.card.addEventListener('change', ({ error, complete }) => {
          const cardError = error && error.message ? error.message : complete ? '' : 'INVALID';
          this.cardErrorSub$.next(cardError);
        });
      });
  }
}

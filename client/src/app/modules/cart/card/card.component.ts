import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
// The `pure` entry loads Stripe.js only when called (never during SSR or on other pages)
import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe, StripeElements, StripeElementLocale } from '@stripe/stripe-js';
import type { PaymentIntentRequest } from '@eshop/shared';

import { ApiService } from '../../../services/api.service';
import { EnvConfigurationService } from '../../../services/env-configuration.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

/** Stripe amounts are integer minor units */
const toMinor = (amount: number) => Math.round(amount * 100);
const GENERIC_ERROR = 'Payment_error';

/**
 * Card payment with the Stripe Payment Element (docs/payments.md), deferred-intent flow: the element
 * shows the cart total; on Pay the server creates the order and PaymentIntent, then Stripe.js confirms
 * (3-D Secure when needed). Apple Pay is turned off.
 */
@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatProgressBar, AsyncPipe, TranslatePipe],
})
export class CardComponent implements OnInit {
  private api = inject(ApiService);
  private env = inject(EnvConfigurationService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  /** Cart total in major units (server-computed) */
  readonly price = input.required<number>();
  readonly currency = input.required<string>();
  readonly lang = input.required<string>();
  /** Customer details from the checkout form, read when the customer presses Pay */
  readonly buildRequest = input.required<() => PaymentIntentRequest>();
  readonly disabled = input(false);

  /** The order is paid (or processing): the parent loads its final state */
  readonly paid = output<string>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('paymentElement');

  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly unavailable = signal(false);

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  constructor() {
    // The element shows (and filters payment methods by) the amount; keep it in sync with the cart
    effect(() => {
      const amount = toMinor(this.price());
      this.elements?.update({ amount });
    });
    this.destroyRef.onDestroy(() => this.elements?.getElement('payment')?.destroy());
  }

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const key = await firstValueFrom(this.env.getConfigType$('FE_STRIPE_PUBLISHABLE_KEY'));
    this.stripe = key ? await loadStripe(key).catch(() => null) : null;
    if (!this.stripe) {
      this.unavailable.set(true);
      return;
    }

    this.elements = this.stripe.elements({
      mode: 'payment',
      amount: toMinor(this.price()),
      currency: this.currency().toLowerCase(),
      locale: this.lang() as StripeElementLocale,
      appearance: { theme: 'stripe', variables: { colorPrimary: this.primaryColor(), borderRadius: '4px' } },
    });
    const element = this.elements.create('payment', {
      layout: 'tabs',
      wallets: { applePay: 'never', googlePay: 'auto' },
    });
    element.on('ready', () => this.ready.set(true));
    element.on('change', (event) => {
      if (event.complete) this.error.set('');
    });
    element.mount(this.container().nativeElement);
  }

  async pay(): Promise<void> {
    const { stripe, elements } = this;
    if (!stripe || !elements || this.busy() || this.disabled()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      // 1. Validate what the customer typed into the element
      const { error: submitError } = await elements.submit();
      if (submitError) {
        this.error.set(submitError.message ?? GENERIC_ERROR);
        return;
      }

      // 2. The server creates the order and the PaymentIntent (amount from the session cart)
      const intent = await firstValueFrom(this.api.createPaymentIntent(this.buildRequest()()));
      if (intent.error) {
        this.error.set(((intent.error as HttpErrorResponse).error as { message?: string } | undefined)?.message ?? GENERIC_ERROR);
        return;
      }

      // 3. Stripe.js confirms; redirects only for methods that need it (then the summary page completes)
      const returnUrl = `${window.location.origin}/${this.lang()}/cart/summary?order=${encodeURIComponent(intent.orderId)}`;
      const result = await stripe.confirmPayment({
        elements,
        clientSecret: intent.clientSecret,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });
      if (result.error) {
        // Card declined, 3-D Secure failed, …: Stripe's message is already in the customer's language
        this.error.set(result.error.message ?? GENERIC_ERROR);
        return;
      }
      this.paid.emit(intent.orderId);
    } catch {
      this.error.set(GENERIC_ERROR);
    } finally {
      this.busy.set(false);
    }
  }

  private primaryColor(): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    return /^#[0-9a-f]{3,8}$/i.test(value) ? value : '#3f51b5';
  }
}

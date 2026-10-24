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
import { MatProgressBar } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
// The `pure` entry loads Stripe.js only when called (never during SSR or on other pages)
import { loadStripe } from '@stripe/stripe-js/pure';
import type { Appearance, Stripe, StripeElements, StripeElementLocale } from '@stripe/stripe-js';
import type { PaymentIntentRequest } from '@eshop/shared';

import { ApiService } from '../../../services/api.service';
import { EnvConfigurationService } from '../../../services/env-configuration.service';
import { ThemeService } from '../../../services/theme.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

/** Stripe amounts are integer minor units */
const toMinor = (amount: number) => Math.round(amount * 100);
const GENERIC_ERROR = 'Payment_error';
/** Stripe's iframe can't use the self-hosted Barlow, so the form uses the system font */
const SYSTEM_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

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
  imports: [MatProgressBar, AsyncPipe, TranslatePipe],
})
export class CardComponent implements OnInit {
  private api = inject(ApiService);
  private env = inject(EnvConfigurationService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private theme = inject(ThemeService);

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
    // The iframe doesn't inherit our CSS: restyle it when the customer switches light/dark
    effect(() => {
      const dark = this.theme.isDark();
      this.elements?.update({ appearance: this.appearance(dark) });
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
      appearance: this.appearance(this.theme.isDark()),
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

  /**
   * The Payment Element's look from our design tokens (light/dark), on top of Stripe's own light
   * (`stripe`) or dark (`night`) theme. Colors are read resolved from the page, since Stripe needs
   * concrete values and some tokens point to the shop's brand variables.
   */
  private appearance(dark: boolean): Appearance {
    const color = (token: string, fallback: string) => this.resolveColor(token) ?? fallback;
    const text = color('--color-text', dark ? '#f2f2f0' : '#111111');
    const muted = color('--color-text-muted', dark ? '#a3a3a0' : '#6b6b6b');
    const border = color('--color-border-control', dark ? '#737370' : '#858582');
    const focus = color('--color-focus', dark ? '#8ab4ff' : '#1a73e8');
    return {
      theme: dark ? 'night' : 'stripe',
      variables: {
        colorPrimary: color('--color-primary', dark ? '#f2f2f0' : '#111111'),
        colorBackground: color('--color-surface', dark ? '#0f0f0f' : '#ffffff'),
        colorText: text,
        colorTextSecondary: muted,
        colorTextPlaceholder: muted,
        colorDanger: color('--color-danger', dark ? '#f2b8b5' : '#b3261e'),
        colorIcon: muted,
        fontFamily: SYSTEM_FONT,
        fontSizeBase: '16px',
        borderRadius: '2px',
        spacingUnit: '4px',
      },
      rules: {
        '.Label': { color: text, fontWeight: '500' },
        '.Input': { border: `1px solid ${border}`, boxShadow: 'none' },
        '.Input:focus': { border: `1px solid ${focus}`, boxShadow: `0 0 0 1px ${focus}`, outline: 'none' },
        '.Tab': { border: `1px solid ${border}`, boxShadow: 'none' },
        '.Tab:focus': { boxShadow: `0 0 0 2px ${focus}` },
        '.Tab--selected': { borderColor: text, boxShadow: `0 0 0 1px ${text}` },
      },
    };
  }

  /** A CSS custom property as the computed `rgb(…)` color, or null (e.g. before the styles load) */
  private resolveColor(token: string): string | null {
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;color:var(${token})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value && !value.startsWith('var') ? value : null;
  }
}

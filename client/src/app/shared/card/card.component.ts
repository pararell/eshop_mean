declare const StripeCheckout: any;

import { Component, Input, HostListener, Inject, PLATFORM_ID  } from '@angular/core';
import { isPlatformServer, DOCUMENT } from '@angular/common';
import { Store } from '@ngrx/store';
import * as actions from './../../store/actions'
import * as fromRoot from '../../store/reducers';

import { keys } from './../../../config/keys';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})

export class CardComponent {

  @Input() price: number;
  @Input() currency: string;
  handler: any;

  constructor(private store: Store<fromRoot.State>,
    @Inject(DOCUMENT)
    private _document   : Document,
    @Inject(PLATFORM_ID)
    private _platformId : Object) {

      if (!isPlatformServer(this._platformId) && typeof StripeCheckout !== 'object') {
        const parentElement : HTMLElement = this._document.querySelector('head') as HTMLElement;
        const scriptEl      : any = this._document.createElement('script') as HTMLElement;
        scriptEl.setAttribute('type', 'text/javascript');
        scriptEl.setAttribute('src', 'https://checkout.stripe.com/checkout.js');
        parentElement.appendChild(scriptEl);
        scriptEl.onload = (event: Event) => {
          this._setHandler();
        }
      } else if (typeof StripeCheckout === 'object' && typeof StripeCheckout.configure === 'function') {
        this._setHandler();
      }
    }

  onClickBuy() {
    this.handler.open({
      name: 'Bluetooth eshop',
      description: 'Pay for products',
      amount: this.price * 100,
      billingAddress: true,
      allowRememberMe: false,
      locale: 'auto',
      currency: 'EUR'
    });
  }

  private _setHandler() {
    this.handler = StripeCheckout.configure({
      key: keys.stripePublishableKey,
      locale: 'auto',
      token: token => {
        const payment = { token: token, amount: this.price, currency: this.currency};
        this.store.dispatch(new actions.LoadPayment(payment));
      }
    });
  }

  @HostListener('window:popstate')
  onPopstate() {
    this.handler.close()
  }



}

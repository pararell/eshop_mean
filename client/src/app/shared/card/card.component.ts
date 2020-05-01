declare const Stripe: any;

import { Component, Input, EventEmitter, Inject, PLATFORM_ID, ViewChild, ElementRef, OnInit, Output  } from '@angular/core';
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

export class CardComponent implements OnInit{

  @Input() price: number;
  @Input() currency: string;
  @Output() payWithCardEmit  = new EventEmitter();
  @ViewChild('cardElement') cardElement: ElementRef;

  handler: any;
  payWithCard = false;
  stripe; // : stripe.Stripe;
  card;
  cardErrors;
  loading = false;
  confirmation;


  constructor(private store: Store<fromRoot.State>,
    @Inject(DOCUMENT)
    private _document   : Document,
    @Inject(PLATFORM_ID)
    private _platformId : Object) {
    }

    ngOnInit() {
      if (!isPlatformServer(this._platformId) && typeof Stripe !== 'object') {
        const parentElement : HTMLElement = this._document.querySelector('head') as HTMLElement;
        const scriptEl      : any = this._document.createElement('script') as HTMLElement;
        scriptEl.setAttribute('type', 'text/javascript');
        scriptEl.setAttribute('src', 'https://js.stripe.com/v3/');
        parentElement.appendChild(scriptEl);
        scriptEl.onload = (event: Event) => {
          this._setHandler();
        }
      } else if (typeof Stripe === 'object') {
        this._setHandler();
      }
    }

  onClickBuy() {
    this.payWithCard = !this.payWithCard;
  }

  async handleForm(e) {
    e.preventDefault();

    this.stripe.createToken(this.card).then((result) => {
      if (result.error) {
       this.cardErrors = result.error.message;
      } else {
        // Send the token to your server.
        this.stripeTokenHandler(result.token);
      }
    });
  }


  private stripeTokenHandler(token) {
    const payment = { token: token, amount: this.price, currency: this.currency};
    this.payWithCardEmit.emit(payment);
  }

  private _setHandler() {

    this.stripe = Stripe(keys.stripePublishableKey);
    const elements = this.stripe.elements();

    this.card = elements.create('card');
    this.card.mount(this.cardElement.nativeElement);

    this.card.addEventListener('change', ({ error }) => {
        this.cardErrors = error && error.message;
    });


  }


}

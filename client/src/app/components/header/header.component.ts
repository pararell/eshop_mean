import { debounceTime, filter, take, delay } from 'rxjs/operators';
import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';

import { Observable, BehaviorSubject, of } from 'rxjs';

import * as fromRoot from '../../store/reducers';
import { Store } from '@ngrx/store';
import * as actions from '../../store/actions';
import { TranslateService } from '../../services/translate.service';
import { isPlatformBrowser } from '@angular/common';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  user$             : Observable<any>;
  cart$             : Observable<any>;
  productTitles$    : Observable<any>;
  userOrders$       : Observable<any>;
  showAutocomplete$ : BehaviorSubject<boolean> = new BehaviorSubject(false);
  languageOptions = ['en', 'sk', 'cs'];
  choosenLanguage = 'en';
  showMobileNav   = false;
  cartUrl         : string;
  signInUrl       : string;
  ordersUrl       : string;
  productUrl      : string;

  readonly query: FormControl = new FormControl();


  constructor(
    @Inject(PLATFORM_ID)
    private _platformId : Object,
    private store: Store<fromRoot.State>, public translate: TranslateService) {
    this.store
      .select(fromRoot.getLang)
      .pipe(filter(Boolean))
      .subscribe((lang:string) => {
        this.choosenLanguage = lang;
        translate.use(this.choosenLanguage);
      });

    this.translate.translationsSub$.pipe(filter(Boolean)).subscribe(translations => {
      this.cartUrl = '/' + this.translate.lang + '/' + (translations['cart'] || 'cart');
      this.signInUrl = '/' + this.translate.lang + '/authorize/signin';
      this.ordersUrl = `/${this.translate.lang}/${translations['orders']}`;
      this.productUrl = `/${this.translate.lang}/${translations['product']}`;
    });
  }

  ngOnInit() {
    this.user$ = this.store.select(fromRoot.getUser);
    this.cart$ = this.store.select(fromRoot.getCart);
    this.productTitles$ = this.store.select(fromRoot.getProductTitles);
    this.userOrders$ = this.store.select(fromRoot.getUserOrders);

    this.query.valueChanges.pipe(debounceTime(200)).subscribe(value => {
      const sendQuery = value || 'EMPTY___QUERY';
      this.store.dispatch(new actions.LoadProductsSearch(sendQuery));
    });

    this.user$.pipe(filter(() => isPlatformBrowser(this._platformId)), take(1)).subscribe(user => {
      if (!user) {
        this.store.dispatch(new actions.LoadUserAction());
      }
    });

    this.user$
      .pipe(
        filter(user => user && user._id),
      )
      .subscribe(user => {
        if (isPlatformBrowser(this._platformId)) {
          localStorage.setItem('accessToken', user.accessToken);
        }
        this.store.dispatch(new actions.LoadUserOrders({ token: user._id }));
      });

    this.cart$.pipe(filter(() => isPlatformBrowser(this._platformId)), take(1)).subscribe(cart => {
      if (!cart) {
        this.store.dispatch(new actions.GetCart());
      }
    });
  }

  onFocus() {
    this.showAutocomplete$.next(true);
  }

  onBlur() {
    of('blur_event').pipe(delay(300), take(1)).subscribe(() => {
      this.showAutocomplete$.next(false);
    })
  }

  onTitleLink(productUrl) {
    this.query.setValue('');
  }

  onLogout(): void {
    if (isPlatformBrowser(this._platformId)) {
      localStorage.removeItem('accessToken');
    }
    this.store.dispatch(new actions.StoreUserAction(null));
  }

  setLang(lang: string) {
    const langUpdate = {
      lang: lang,
      currency: lang === 'cs' ? 'CZK' : '€'
    };
    this.store.dispatch(new actions.ChangeLang(langUpdate));
  }
}

import { debounceTime, filter, take, delay } from 'rxjs/operators';
import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../store/reducers';
import * as actions from '../../store/actions';
import { TranslateService } from '../../services/translate.service';
import { environment } from '../../../environments/environment';
import { languages } from '../../shared/constants';
import { Cart, User } from '../../shared/models';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  user$             : Observable<User>;
  cart$             : Observable<Cart>;
  productTitles$    : Observable<string[]>;
  userOrders$       : Observable<any>;
  showAutocomplete$ : BehaviorSubject<boolean> = new BehaviorSubject(false);
  languageOptions = languages;
  lang$             : Observable<string>;
  showMobileNav   = false;
  cartUrl         : string;
  googleAuthUrl   : string;
  signInUrl       : string;
  ordersUrl       : string;
  productUrl      : string;

  readonly query: FormControl = new FormControl();

  constructor(
    @Inject(PLATFORM_ID)
    private _platformId : Object,
    private store: Store<fromRoot.State>, public translate: TranslateService) {

    this.lang$ = this.store.select(fromRoot.getLang);

    this.translate.translationsSub$.pipe(filter(Boolean)).subscribe(translations => {
      this.cartUrl = '/' + this.translate.lang + '/' + (translations['cart'] || 'cart');
      this.signInUrl = '/' + this.translate.lang + '/authorize/signin';
      this.ordersUrl = `/${this.translate.lang}/${translations['orders']}`;
      this.productUrl = `/${this.translate.lang}/${translations['product']}`;
    });

    this.googleAuthUrl = environment.apiUrl + '/api/auth/google';
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
  }

  onFocus(): void {
    this.showAutocomplete$.next(true);
  }

  onBlur(): void {
    of('blur_event').pipe(delay(300), take(1)).subscribe(() => {
      this.showAutocomplete$.next(false);
    })
  }

  onTitleLink(): void {
    this.query.setValue('');
  }

  onLogout(): void {
    if (isPlatformBrowser(this._platformId)) {
      localStorage.removeItem('accessToken');
    }
    this.store.dispatch(new actions.StoreUserAction(null));
  }

  setLang(lang: string): void {
    const langUpdate = {
      lang,
      currency: lang === 'cs' ? 'CZK' : 'EUR'
    };
    this.store.dispatch(new actions.ChangeLang(langUpdate));
  }
}

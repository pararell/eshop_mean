import { debounceTime, take, delay } from 'rxjs/operators';
import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../store/reducers';
import * as actions from '../../store/actions';
import { TranslateService } from '../../services/translate.service';
import { environment } from '../../../environments/environment';
import { languages, currencyLang, accessTokenKey } from '../../shared/constants';
import { Cart, User, Order } from '../../shared/models';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  user$             : Observable<User>;
  cart$             : Observable<Cart>;
  productTitles$    : Observable<string[]>;
  userOrders$       : Observable<Order[]>;
  showAutocomplete$ = new BehaviorSubject(false);
  languageOptions   = languages;
  lang$             : Observable<string>;
  showMobileNav     = false;
  googleAuthUrl     : string;

  readonly query: FormControl = new FormControl();

  constructor(
    @Inject(PLATFORM_ID)
    private _platformId : Object,
    private store: Store<fromRoot.State>,
    public translate: TranslateService) {

    this.lang$ = this.translate.getLang$();

    this.googleAuthUrl = environment.apiUrl + '/api/auth/google';
  }

  ngOnInit() {
    this.user$ = this.store.select(fromRoot.getUser);
    this.cart$ = this.store.select(fromRoot.getCart);
    this.productTitles$ = this.store.select(fromRoot.getProductTitles);
    this.userOrders$ = this.store.select(fromRoot.getUserOrders);

    this.query.valueChanges.pipe(debounceTime(200)).subscribe(value => {
      const sendQuery = value || 'EMPTY___QUERY';
      this.store.dispatch(new actions.GetProductsSearch(sendQuery));
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
      localStorage.removeItem(accessTokenKey);
    }
    this.store.dispatch(new actions.StoreUser(null));
  }

  scrollToTop(): void {
    of('scroll_content').pipe(delay(100), take(1)).subscribe(() => {
      this.store.dispatch(new actions.UpdatePosition({cartComponent: 0}));
    });
  }

  setLang(lang: string): void {
    const langUpdate = {
      lang,
      currency: currencyLang[lang]
    };
    this.store.dispatch(new actions.ChangeLanguage(langUpdate));
  }
}

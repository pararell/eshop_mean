import { languageFromUrl, replaceUrlLanguage } from '../../../utils/language-url';
import { debounceTime, take, delay } from 'rxjs/operators';
import { Component, OnInit, PLATFORM_ID, Signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';
import { environment } from '../../../../environments/environment';
import { languages, currencyLang, accessTokenKey } from '../../../shared/constants';
import { Cart, User, Order } from '../../../shared/models';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';

import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';

import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    TranslatePipe,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatInputModule,
    MatToolbarModule,
    MatMenuModule,
    MatIconModule,
  ],
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);
  private _platformId = inject(PLATFORM_ID);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  translate = inject(TranslateService);

  user$!: Signal<User | null>;
  cart$!: Signal<Cart | null>;
  productTitles$!: Signal<string[]>;
  userOrders$!: Signal<Order[] | null>;
  showAutocomplete$ = new BehaviorSubject(false);
  languageOptions = languages;
  lang$: Observable<string>;
  showMobileNav = false;
  googleAuthUrl: string;

  readonly query: FormControl = new FormControl();

  constructor() {
    this.lang$ = this.translate.getLang$();

    this.googleAuthUrl = environment.apiUrl + '/api/auth/google';
  }

  ngOnInit() {
    this.user$ = this.selectors.user;
    this.cart$ = this.selectors.cart;
    this.productTitles$ = this.selectors.productsTitles;
    this.userOrders$ = this.selectors.userOrders;

    this.query.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      const sendQuery = value || 'EMPTY___QUERY';
      this.store.getProductSearch(sendQuery);
    });
  }

  onFocus(): void {
    this.showAutocomplete$.next(true);
  }

  onBlur(): void {
    of('blur_event')
      .pipe(delay(300), take(1))
      .subscribe(() => {
        this.showAutocomplete$.next(false);
      });
  }

  onTitleLink(): void {
    this.query.setValue('');
  }

  onLogout(): void {
    if (isPlatformBrowser(this._platformId)) {
      localStorage.removeItem(accessTokenKey);
    }
    this.store.storeUser(null);
  }

  scrollToTop(): void {
    of('scroll_content')
      .pipe(delay(100), take(1))
      .subscribe(() => {
        this.store.updatePosition({ cartComponent: 0 });
      });
  }

  setLang(lang: string): void {
    // On a language-prefixed page the URL decides the language (see languageGuard)
    const url = this.router.url;
    if (languageFromUrl(url)) {
      this.router.navigateByUrl(replaceUrlLanguage(url, lang));
      return;
    }
    const langUpdate = {
      lang,
      currency: currencyLang[lang],
    };
    this.store.changeLanguage(langUpdate);
  }
}

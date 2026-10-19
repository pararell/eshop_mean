import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, Signal, computed, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe, NgTemplateOutlet, UpperCasePipe, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { Observable, of } from 'rxjs';
import { debounceTime, delay, take } from 'rxjs/operators';

import { languageFromUrl, replaceUrlLanguage } from '../../../utils/language-url';
import { TranslateService } from '../../../services/translate.service';
import { ThemeService } from '../../../services/theme.service';
import { environment } from '../../../../environments/environment';
import { languages, currencyLang, accessTokenKey } from '../../../shared/constants';
import { Cart, User, Order } from '../../../shared/models';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    UpperCasePipe,
    NgTemplateOutlet,
    TranslatePipe,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatMenuModule,
    IconComponent,
  ],
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private translate = inject(TranslateService);
  readonly theme = inject(ThemeService);

  readonly user$: Signal<User | null> = this.selectors.user;
  readonly cart$: Signal<Cart | null> = this.selectors.cart;
  readonly productTitles$: Signal<string[]> = this.selectors.productsTitles;
  readonly userOrders$: Signal<Order[] | null> = this.selectors.userOrders;
  readonly logo = this.theme.logo;
  readonly cartCount = computed(() => this.cart$()?.totalQty ?? 0);
  readonly cartLabel = computed(() => (this.cartCount() ? `Cart, ${this.cartCount()} items` : 'Cart'));

  readonly languageOptions = languages;
  readonly lang$: Observable<string> = this.translate.getLang$();
  readonly googleAuthUrl = environment.apiUrl + '/api/auth/google';
  readonly query = new FormControl<string>('', { nonNullable: true });

  ngOnInit(): void {
    this.query.valueChanges.pipe(debounceTime(200)).subscribe((value) => {
      this.store.getProductSearch(value || 'EMPTY___QUERY');
    });
  }

  openProduct(titleUrl: string): void {
    this.lang$.pipe(take(1)).subscribe((lang) => {
      void this.router.navigate(['/' + lang + '/product/' + titleUrl]);
      this.query.setValue('', { emitEvent: false });
    });
  }

  onLogout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(accessTokenKey);
    }
    this.store.storeUser(null);
  }

  scrollToTop(): void {
    of('scroll_content')
      .pipe(delay(100), take(1))
      .subscribe(() => this.store.updatePosition({ cartComponent: 0 }));
  }

  setLang(lang: string): void {
    // On a language-prefixed page the URL decides the language (see languageGuard)
    const url = this.router.url;
    if (languageFromUrl(url)) {
      void this.router.navigateByUrl(replaceUrlLanguage(url, lang));
      return;
    }
    this.store.changeLanguage({ lang, currency: currencyLang[lang] });
  }
}

import { Component, ElementRef, Renderer2, PLATFORM_ID, ChangeDetectionStrategy, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser, PlatformLocation } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { filter, take, delay, map, skip } from 'rxjs/operators';
import { of } from 'rxjs';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';

import { TranslateService } from './services/translate.service';
import { SeoService } from './services/seo.service';
import { currencyLang } from './shared/constants';
import { SignalStore } from './store/signal.store';
import { SignalStoreSelectors } from './store/signal.store.selectors';
import { FooterComponent } from './shared/components/footer/footer.component';
import { HeaderComponent } from './shared/components/header/header.component';

const isAdminUrl = (url: string) => /^\/[a-z]{2}\/dashboard(?:[/?#]|$)/.test(url);

@Component({
  selector: 'eshop-mean-app',
  imports: [RouterOutlet, FooterComponent, HeaderComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private elRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);
  private signalStore = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);

  /**
   * The admin has its own frame (modules/dashboard/admin-shell): no shop header and footer there.
   * Known from the first render (also in SSR), and switched as soon as a navigation starts.
   */
  readonly admin = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationStart || e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
      map((e) => isAdminUrl(e instanceof NavigationStart ? e.url : this.router.url)),
    ),
    { initialValue: isAdminUrl(inject(PlatformLocation).pathname) },
  );

  rememberScroll: { [component: string]: number } = {};
  position = 0;

  constructor() {
    // Hydrated and interactive: lets e2e tests type only once forms are live (typing earlier is lost)
    afterNextRender(() => this.elRef.nativeElement.ownerDocument.documentElement.setAttribute('data-app-ready', ''));
    const translate = this.translate;

    this.translate
      .getLang$()
      .pipe(filter(Boolean), take(1))
      .subscribe((lang: string) => {
        const langUpdate = {
          lang,
          currency: currencyLang[lang],
        };
        this.signalStore.changeLanguage(langUpdate);
      });

    toObservable(this.selectors.appLang)
      .pipe(filter(Boolean), skip(1))
      .subscribe((lang: string) => {
        translate.use(lang);
      });

    toObservable(this.selectors.position)
      .pipe(filter(Boolean))
      .subscribe((componentPosition: { [component: string]: number }) => {
        this.rememberScroll = { ...this.rememberScroll, ...componentPosition };
        this.renderer.setProperty(this.elRef.nativeElement.querySelector('.main-scroll-wrap'), 'scrollTop', 0);
      });

    this.signalStore.getUser();

    toObservable(this.selectors.user)
      .pipe(delay(100))
      .subscribe((user) => {
        if (user && user.email) {
          this.signalStore.getUserOrders();
        }
      });

    this.translate
      .getLang$()
      .pipe(filter((lang) => !!lang && isPlatformBrowser(this.platformId)))
      .subscribe((lang) => {
        this.signalStore.getCart(lang);
        // Page titles for the shop menu. Not in the admin: its page editor loads the full pages into
        // the same state, and a later titles-only answer would replace their content
        if (!this.admin()) this.signalStore.getPages({ lang, titles: true });
      });

    // Titles, descriptions and the shop's structured data for every page (SSR included)
    inject(SeoService);
  }

  onScrolling(event: Event): void {
    this.position = (event.target as HTMLElement).scrollTop;
  }

  /** `component` is the activated route component instance; some expose a `component` name. */
  onActivate(component: { component?: string }): void {
    const currentComponent = component['component'];
    const position = currentComponent && this.rememberScroll[currentComponent] ? this.rememberScroll[currentComponent] : 0;

    of('activate_event')
      .pipe(delay(5), take(1))
      .subscribe(() => {
        this.renderer.setProperty(this.elRef.nativeElement.querySelector('.main-scroll-wrap'), 'scrollTop', position);
      });
  }

  onDeactivate(component: { component?: string }): void {
    if (Object.keys(component).includes('component')) {
      const currentComponent = component['component']!;
      this.rememberScroll = { ...this.rememberScroll, [currentComponent]: this.position };
    }
  }
}

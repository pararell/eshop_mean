import { Component, ElementRef, Renderer2, PLATFORM_ID, ChangeDetectionStrategy, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take, delay, map, skip } from 'rxjs/operators';
import { of } from 'rxjs';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';

import { TranslateService } from './services/translate.service';
import { JsonLDService } from './services/jsonLD.service';
import { currencyLang } from './shared/constants';
import { SignalStore } from './store/signal.store';
import { SignalStoreSelectors } from './store/signal.store.selectors';
import { FooterComponent } from './shared/components/footer/footer.component';
import { HeaderComponent } from './shared/components/header/header.component';

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
  private jsonLDService = inject(JsonLDService);
  private platformId = inject(PLATFORM_ID);
  private signalStore = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);

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
        this.signalStore.getPages({ lang, titles: true });
      });

    if (isPlatformServer(this.platformId)) {
      this.jsonLDService.insertSchema(this.jsonLDService.websiteSchema);
      this.jsonLDService.insertSchema(this.jsonLDService.orgSchema, 'structured-data-org');
    }

    this.router.events.pipe(
      filter((event) => event instanceof NavigationStart),
      map((_checkRoute: NavigationStart) => {
        this.jsonLDService.insertSchema(this.jsonLDService.websiteSchema);
        this.jsonLDService.insertSchema(this.jsonLDService.orgSchema, 'structured-data-org');
      }),
    );
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

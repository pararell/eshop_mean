import { Component, ElementRef, Renderer2, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser, isPlatformServer, Location } from '@angular/common';
import { Store, select } from '@ngrx/store';
import { filter, take, delay, skip, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { NavigationStart, Router } from '@angular/router';

import { TranslateService } from './services/translate.service';
import { JsonLDService } from './services/jsonLD.service';
import * as fromRoot from './store/reducers';
import * as actions from './store/actions';
import { User } from './shared/models';
import { languages, currencyLang } from './shared/constants';

@Component({
  selector    : 'eshop-mean-app',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent {

  rememberScroll  : {[component: string]: number} = {};
  position = 0;

  constructor(
    private elRef         : ElementRef,
    private renderer      : Renderer2,
    private store         : Store<fromRoot.State>,
    private router        : Router,
    private location      : Location,
    private translate     : TranslateService,
    private jsonLDService : JsonLDService,
    @Inject(PLATFORM_ID)
    private platformId    : Object) {

    this.translate.getLang$()
      .pipe(filter(Boolean), take(1))
      .subscribe((lang: string) => {
        const langUpdate = {
          lang,
          currency  : currencyLang[lang]
        };
        this.store.dispatch(new actions.ChangeLanguage(langUpdate));
    });

    this.store.select(fromRoot.getLang)
      .pipe(filter(Boolean), skip(1))
      .subscribe((lang: string) => {
        // const checkLang = this.router.url.split('/').filter(Boolean)[0];
        // if (checkLang && languages.includes(checkLang)) {
        //   const urlWithNewLang = this.router.url.replace(checkLang, lang);
        //   this.location.replaceState(urlWithNewLang);
        // }
        translate.use(lang);
    });

    this.store.pipe(select(fromRoot.getPosition))
      .pipe(filter(Boolean))
      .subscribe((componentPosition: {[component: string]: number}) => {
        this.rememberScroll = {...this.rememberScroll, ...componentPosition};
        this.renderer.setProperty(this.elRef.nativeElement.querySelector('.main-scroll-wrap'), 'scrollTop', 0);
    });

    this.store.select(fromRoot.getUser).pipe(filter(() => isPlatformBrowser(this.platformId)), take(1))
      .subscribe(user => {
        if (!user) {
          this.store.dispatch(new actions.GetUser());
        }
    });

    this.store.select(fromRoot.getUser).pipe(delay(100))
      .subscribe((user: User) => {
      if (user && user.email) {
        this.store.dispatch(new actions.GetUserOrders());
      }
    });

    this.translate.getLang$()
      .pipe(filter(lang => !!lang && isPlatformBrowser(this.platformId)))
      .subscribe(lang => {
        this.store.dispatch(new actions.GetCart(lang));
        this.store.dispatch(new actions.GetPages({lang, titles: true}));
      });

    if (isPlatformServer(this.platformId)) {
      this.jsonLDService.insertSchema(this.jsonLDService.websiteSchema);
      this.jsonLDService.insertSchema(this.jsonLDService.orgSchema, 'structured-data-org');
    }

    this.router.events.pipe(
      filter((event) => event instanceof NavigationStart),
      map((checkRoute: NavigationStart) => {
        this.jsonLDService.insertSchema(this.jsonLDService.websiteSchema);
        this.jsonLDService.insertSchema(this.jsonLDService.orgSchema, 'structured-data-org');
      })
     );
  }

  onScrolling(event: Event): void {
    this.position = event['target']['scrollTop'];
  }

  onActivate(component: string): void {
    const currentComponent = component['component'];
    const position = (currentComponent && this.rememberScroll[currentComponent])
      ? this.rememberScroll[currentComponent]
      : 0;

    of('activate_event').pipe(delay(5), take(1)).subscribe(() => {
      this.renderer.setProperty(this.elRef.nativeElement.querySelector('.main-scroll-wrap'), 'scrollTop', position)
    })
  }

  onDeactivate(component: string): void {
    if (Object.keys(component).includes('component')) {
      const currentComponent = component['component'];
      this.rememberScroll = {...this.rememberScroll, [currentComponent]: this.position};
    }
  }

}

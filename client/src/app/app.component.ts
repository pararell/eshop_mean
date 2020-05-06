import { TranslateService } from './services/translate.service';
import { filter, take, delay } from 'rxjs/operators';
import { Component, ElementRef, Renderer2 } from '@angular/core';
import { Store, select } from '@ngrx/store';
import * as fromRoot from './store/reducers';
import * as actions from './store/actions';
import { of } from 'rxjs';

@Component({
  selector    : 'app-root',
  templateUrl : './app.component.html',
  styleUrls   : ['./app.component.scss']
})
export class AppComponent {

  rememberScroll  : any = {};
  position        = 0;

  constructor(
    private elRef     : ElementRef,
    private renderer  : Renderer2,
    private store     : Store<fromRoot.State>,
    private translate : TranslateService) {

    this.translate.languageSub$
      .pipe(filter(Boolean), take(1))
      .subscribe((lang: string) => {
        const langUpdate = {
          lang,
          currency  : lang === 'cs' ? 'CZK' : 'EUR'
        };
      this.store.dispatch(new actions.ChangeLang(langUpdate));
      });

    this.store.pipe(select(fromRoot.getPosition))
      .pipe(filter(Boolean))
      .subscribe((componentPosition: any) => {
        this.rememberScroll = {...this.rememberScroll, componentPosition};
        this.renderer.setProperty(this.elRef.nativeElement.querySelector('.main-scroll-wrapp'), 'scrollTop', 0);
      });
  }

  onScrolling(event: any) {
    this.position = event['target']['scrollTop'];
  }

  onActivate(component: string) {
    const currentComponent = component['component'];
    const position = (currentComponent && this.rememberScroll[currentComponent])
      ? this.rememberScroll[currentComponent]
      : 0;

    of('activate_event').pipe(delay(5), take(1)).subscribe(() => {
      this.renderer.setProperty(this.elRef.nativeElement.querySelector('.main-scroll-wrapp'), 'scrollTop', position)
    })
}

  onDeactivate(component: string) {
    if (Object.keys(component).includes('component')) {
      const currentComponent = component['component'];
      this.rememberScroll = {...this.rememberScroll, [currentComponent]: this.position};
    }
  }


}

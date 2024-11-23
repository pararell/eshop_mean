import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal } from '@angular/core';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

import { TranslateService } from '../../../services/translate.service';
import { Page } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


@Component({
    selector: 'app-page',
    templateUrl: './page.component.html',
    styleUrls: ['./page.component.scss'],
    imports: [CommonModule, TranslatePipe, MatButtonModule, MatIconModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponent {

  lang$: Observable<string>;
  titleUrl$: Observable<string>;
  page$: Signal<Page>;
  pageSub: Subscription;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private store: SignalStore,
    private selectors: SignalStoreSelectors,
    private translate: TranslateService) {

    this.lang$ = this.translate.getLang$().pipe(filter((lang: string) => !!lang));
    this.titleUrl$ = this.route.params.pipe(map(params => params['titleUrl']));
    this.page$ = this.selectors.page;

    this.pageSub = combineLatest([
      this.titleUrl$,
      this.lang$]
    ).subscribe(([titleUrl, lang ]: [string, string]) => {
      this.store.getPage({ titleUrl, lang });
    })
  }

  goBack(): void {
    this.location.back();
  }

}

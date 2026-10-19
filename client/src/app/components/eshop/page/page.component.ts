import type { LanguageCode } from '@eshop/shared';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { TranslateService } from '../../../services/translate.service';
import { Page } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
  imports: [CommonModule, TranslatePipe, RouterLink, MatProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  private route = inject(ActivatedRoute);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private translate = inject(TranslateService);

  lang$: Observable<LanguageCode>;
  titleUrl$: Observable<string>;
  page$: Signal<Page | null>;
  pageSub: Subscription;

  constructor() {
    this.lang$ = this.translate.getLang$().pipe(filter((lang): lang is LanguageCode => !!lang));
    this.titleUrl$ = this.route.params.pipe(map((params) => params['titleUrl']));
    this.page$ = this.selectors.page;

    this.pageSub = combineLatest([this.titleUrl$, this.lang$]).subscribe(([titleUrl, lang]: [string, string]) => {
      this.store.getPage({ titleUrl, lang });
    });
  }
}

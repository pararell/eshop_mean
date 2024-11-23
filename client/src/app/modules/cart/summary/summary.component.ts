import { Location } from '@angular/common';
import { Observable } from 'rxjs';
import { TranslateService } from './../../../services/translate.service';
import { Component, Signal } from '@angular/core';

import { Order } from '../../../shared/models';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';

@Component({
    selector: 'app-summary',
    templateUrl: './summary.component.html',
    styleUrls: ['./summary.component.scss'],
    standalone: false
})
export class SummaryComponent {
  order$: Signal<Order>;
  lang$: Observable<string>;

  readonly component = 'summaryComponent';

  constructor(private location: Location, private selectors: SignalStoreSelectors, public translate: TranslateService) {
    this.order$ = this.selectors.order;
    this.lang$ = this.translate.getLang$();
  }

  goBack(): void {
    this.location.back();
  }
}

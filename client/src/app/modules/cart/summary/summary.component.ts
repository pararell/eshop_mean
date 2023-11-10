import { Location } from '@angular/common';
import { Observable } from 'rxjs';
import { TranslateService } from './../../../services/translate.service';
import { Component } from '@angular/core';

import { Store } from '@ngrx/store';

import * as fromRoot from '../../../store/reducers';
import { Order } from '../../../shared/models';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
})
export class SummaryComponent {
  order$: Observable<Order>;
  lang$: Observable<string>;

  readonly component = 'summaryComponent';

  constructor(private location: Location, private store: Store<fromRoot.State>, public translate: TranslateService) {
    this.order$ = this.store.select(fromRoot.getOrder);
    this.lang$ = this.translate.getLang$();
  }

  goBack(): void {
    this.location.back();
  }
}

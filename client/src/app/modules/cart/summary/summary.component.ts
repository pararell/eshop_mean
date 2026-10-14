import { Location, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { TranslateService } from './../../../services/translate.service';
import { Component, Signal, ChangeDetectionStrategy, inject } from '@angular/core';

import { Order } from '../../../shared/models';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { MatButton } from '@angular/material/button';
import { OrderInfoComponent } from '../../../shared/components/order-info/order-info.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatButton, OrderInfoComponent, AsyncPipe, TranslatePipe],
})
export class SummaryComponent {
  private location = inject(Location);
  private selectors = inject(SignalStoreSelectors);
  translate = inject(TranslateService);

  order$: Signal<Order | null>;
  lang$: Observable<string>;

  readonly component = 'summaryComponent';

  constructor() {
    this.order$ = this.selectors.order;
    this.lang$ = this.translate.getLang$();
  }

  goBack(): void {
    this.location.back();
  }
}

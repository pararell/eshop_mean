import { Component, Signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';

import { Order } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { OrdersListComponent } from '../../order/components/orders-list/orders-list.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-orders-edit',
  templateUrl: './orders-edit.component.html',
  styleUrls: ['./orders-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [OrdersListComponent, AsyncPipe],
})
export class OrdersEditComponent {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  translate = inject(TranslateService);

  orders$: Signal<Order[] | null>;
  orderUrl!: string;
  lang$: Observable<string>;

  readonly component = 'ordersEdit';

  constructor() {
    this.lang$ = this.translate.getLang$();

    this.store.getOrders();
    this.orders$ = this.selectors.orders;
  }
}

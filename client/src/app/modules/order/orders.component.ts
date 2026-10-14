import { Component, Signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TranslateService } from '../../services/translate.service';
import { Order } from '../../shared/models';
import { SignalStoreSelectors } from '../../store/signal.store.selectors';
import { OrdersListComponent } from './components/orders-list/orders-list.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [OrdersListComponent, AsyncPipe],
})
export class OrdersComponent {
  private selectors = inject(SignalStoreSelectors);
  private translate = inject(TranslateService);

  orders$: Signal<Order[] | null>;
  orderUrl!: string;
  lang$: Observable<string>;

  readonly component = 'orders';

  constructor() {
    this.lang$ = this.translate.getLang$();
    this.orders$ = this.selectors.userOrders;
  }
}

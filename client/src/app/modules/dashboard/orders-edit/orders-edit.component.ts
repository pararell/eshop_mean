import { Component, Signal } from '@angular/core';
import { Observable } from 'rxjs';

import { TranslateService } from '../../../services/translate.service';

import { Order } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';

@Component({
  selector: 'app-orders-edit',
  templateUrl: './orders-edit.component.html',
  styleUrls: ['./orders-edit.component.scss']
})
export class OrdersEditComponent {

  orders$: Signal<Order[]>;
  orderUrl: string;
  lang$: Observable<string>;

  readonly component = 'ordersEdit';

  constructor(private store: SignalStore, private selectors: SignalStoreSelectors, public translate: TranslateService) {

    this.lang$ = this.translate.getLang$();

    this.store.getOrders();
    this.orders$ = this.selectors.orders;
   }

}

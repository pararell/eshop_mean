import { Component, Signal } from '@angular/core';
import { Observable } from 'rxjs';

import { TranslateService } from '../../services/translate.service';
import { Order } from '../../shared/models';
import { SignalStoreSelectors } from '../../store/signal.store.selectors';

@Component({
    selector: 'app-orders',
    templateUrl: './orders.component.html',
    styleUrls: ['./orders.component.scss'],
    standalone: false
})
export class OrdersComponent {

  orders$  : Signal<Order[]>;
  orderUrl : string;
  lang$    : Observable<string>;

  readonly component = 'orders';

  constructor(private selectors: SignalStoreSelectors, private translate: TranslateService) {
    this.lang$ = this.translate.getLang$();
    this.orders$ = this.selectors.userOrders;
   }


}

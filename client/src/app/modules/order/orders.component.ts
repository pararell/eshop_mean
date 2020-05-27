import { Store } from '@ngrx/store';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { TranslateService } from '../../services/translate.service';
import * as fromRoot from '../../store/reducers';
import { Order } from '../../shared/models';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent {

  orders$  : Observable<Order[]>;
  orderUrl : string;
  lang$    : Observable<string>;

  readonly component = 'orders';

  constructor(private store: Store<fromRoot.State>, private translate: TranslateService) {
    this.lang$ = this.translate.getLang$();
    this.orders$ = this.store.select(fromRoot.getUserOrders);
   }


}

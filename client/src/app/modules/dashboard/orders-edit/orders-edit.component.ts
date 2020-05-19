import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';

import { TranslateService } from '../../../services/translate.service';
import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions'
import { Order } from '../../../shared/models';

@Component({
  selector: 'app-orders-edit',
  templateUrl: './orders-edit.component.html',
  styleUrls: ['./orders-edit.component.scss']
})
export class OrdersEditComponent {

  orders$: Observable<Order[]>;
  orderUrl: string;
  lang$: Observable<string>;

  readonly component = 'ordersEdit';

  constructor(private store: Store<fromRoot.State>, public translate: TranslateService) {

    this.lang$ = this.translate.getLang$();

    this.store.dispatch(new actions.GetOrders());
    this.orders$ = this.store.select(fromRoot.getOrders);
   }

}

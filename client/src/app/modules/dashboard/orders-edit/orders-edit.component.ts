import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs/operators';

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

  constructor(private store: Store<fromRoot.State>, public translate: TranslateService) {
    this.translate.translationsSub$.pipe(filter(Boolean)).subscribe(translations => {
      this.orderUrl = `/${this.translate.lang}/dashboard/${translations['orders']}/`;
    });

    this.store.dispatch(new actions.GetOrders());
    this.orders$ = this.store.select(fromRoot.getOrders);
   }

}

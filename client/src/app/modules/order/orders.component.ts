import { filter } from 'rxjs/operators';
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

  orders$   : Observable<Order[]>;
  orderUrl : string;

  constructor(private store: Store<fromRoot.State>, private translate: TranslateService) {
    this.translate.translationsSub$.pipe(filter(Boolean)).subscribe(translations => {
      this.orderUrl = `/${this.translate.lang}/${translations['orders']}/`;
    });

    this.orders$ = this.store.select(fromRoot.getUserOrders);

   }


}

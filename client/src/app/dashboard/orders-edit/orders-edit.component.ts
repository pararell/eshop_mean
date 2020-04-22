import { TranslateService } from './../../services/translate.service';
import { Component } from '@angular/core';

import { Observable } from 'rxjs';

import * as fromRoot from '../../store/reducers';
import { Store } from '@ngrx/store';
import * as actions from './../../store/actions'

@Component({
  selector: 'app-orders-edit',
  templateUrl: './orders-edit.component.html',
  styleUrls: ['./orders-edit.component.scss']
})
export class OrdersEditComponent {

  orders$: Observable<any>;

  constructor(private store: Store<fromRoot.State>, public translate: TranslateService) {

     this.store.dispatch(new actions.LoadOrders());

     this.orders$ = this.store.select(fromRoot.getOrders);
   }

}

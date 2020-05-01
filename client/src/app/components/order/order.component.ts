import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { TranslateService } from '../../services/translate.service';
import { Component } from '@angular/core';

import { Observable } from 'rxjs';

import * as fromRoot from '../../store/reducers';
import { Store } from '@ngrx/store';
import * as actions from '../../store/actions'

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent {

  order$    : Observable<any>;
  ordersUrl : string;

  constructor(
    private location  : Location,
    private store     : Store<fromRoot.State>,
    public  translate : TranslateService,
    private _route    : ActivatedRoute) {

    this.store.select(fromRoot.getLang)
    .pipe(filter(Boolean))
    .subscribe(lang => {
      this.ordersUrl = `/${lang}/${this.translate.data['orders']}`;
    });

    this._route.params.pipe(map(params => params['id']))
    .subscribe(params => {
      this.store.dispatch(new actions.LoadOrder(params));
    });

    this.order$ = this.store.select(fromRoot.getOrderId);

   }

   goBack() {
    this.location.back();
  }


}

import { map } from 'rxjs/operators';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { Observable } from 'rxjs';

import * as fromRoot from '../../../../store/reducers';
import { Store } from '@ngrx/store';
import * as actions from './../../../../store/actions'
import { TranslateService } from '../../../../services/translate.service';

@Component({
  selector: 'app-order-edit',
  templateUrl: './order-edit.component.html',
  styleUrls: ['./order-edit.component.scss']
})
export class OrderEditComponent {

  order$: Observable<any>;
  statusForm: FormGroup;
  orderId: string;

  showForm = false;

  constructor(
    private store: Store<fromRoot.State>,
    private _route: ActivatedRoute,
    private _fb: FormBuilder,
    private location: Location ,
    public translate: TranslateService) {

    this.statusForm = this._fb.group({
      status: ['', Validators.required ]
    });

    this._route.params.pipe(map(params => params['id']))
      .subscribe(params => {
        this.store.dispatch(new actions.LoadOrder(params));
        this.orderId = params;
    });

     this.order$ = this.store.select(fromRoot.getOrderId);
   }

   toggleForm() {
    this.showForm = !this.showForm;
   }

   submit() {
     this.showForm = false;
     const status = this.statusForm.get('status').value;
     this.store.dispatch(new actions.UpdateOrder({
      orderId: this.orderId,
      status
     }));
   }

   goBack() {
    this.location.back();
  }

}

import { map } from 'rxjs/operators';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../../store/reducers';
import * as actions from './../../../../store/actions';
import { TranslateService } from '../../../../services/translate.service';
import { Order, OrderStatus } from '../../../../shared/models';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent {
  @Input() type: string;

  order$: Observable<Order>;
  statusForm: FormGroup;
  orderId: string;
  statusOptions = OrderStatus;
  showForm = false;
  lang$: Observable<string>;

  constructor(
    private store: Store<fromRoot.State>,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private location: Location,
    public translate: TranslateService
  ) {
    this.lang$ = this.translate.getLang$();

    this.statusForm = this.fb.group({
      status: ['', Validators.required],
    });

    this.route.params.pipe(map((params) => params['id'])).subscribe((params) => {
      this.store.dispatch(new actions.GetOrder(params));
      this.orderId = params;
    });

    this.order$ = this.store.select(fromRoot.getOrderId);
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  submit(): void {
    this.showForm = false;
    const status = this.statusForm.get('status').value;
    this.store.dispatch(
      new actions.UpdateOrder({
        orderId: this.orderId,
        status,
      })
    );
  }

  goBack(): void {
    this.location.back();
  }
}

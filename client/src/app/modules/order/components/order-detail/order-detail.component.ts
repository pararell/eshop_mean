import { filter, map, take } from 'rxjs/operators';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Component, Input, Signal } from '@angular/core';
import { Location } from '@angular/common';
import { Observable, combineLatest } from 'rxjs';

import { TranslateService } from '../../../../services/translate.service';
import { Order, OrderStatus } from '../../../../shared/models';
import { SignalStore } from '../../../../store/signal.store';
import { SignalStoreSelectors } from '../../../../store/signal.store.selectors';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent {
  @Input() type: string;

  order$: Signal<Order>;
  statusForm: FormGroup;
  orderId: string;
  statusOptions = OrderStatus;
  showForm = false;
  lang$: Observable<string>;

  constructor(
    private store: SignalStore,
    private selectors: SignalStoreSelectors,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private location: Location,
    public translate: TranslateService
  ) {
    this.lang$ = this.translate.getLang$();

    this.statusForm = this.fb.group({
      status: ['', Validators.required],
    });

    combineLatest([ toObservable(this.selectors.user).pipe(filter(user => !!user)),this.route.params.pipe(map((params) => params['id']))]).subscribe(([_user, id]) => {
      this.store.getOrder(id);
      this.orderId = id;
    });

    this.order$ = this.selectors.order;
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  submit(): void {
    this.showForm = false;
    const status = this.statusForm.get('status').value;
    this.store.updateOrder({
        orderId: this.orderId,
        status,
      });
  }

  goBack(): void {
    this.location.back();
  }
}

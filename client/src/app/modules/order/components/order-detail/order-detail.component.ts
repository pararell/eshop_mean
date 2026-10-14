import { filter, map } from 'rxjs/operators';
import { FormGroup, Validators, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Component, Signal, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { Location, AsyncPipe, DatePipe, KeyValuePipe } from '@angular/common';
import { Observable, combineLatest } from 'rxjs';

import { TranslateService } from '../../../../services/translate.service';
import { Order, OrderStatus } from '../../../../shared/models';
import { SignalStore } from '../../../../store/signal.store';
import { SignalStoreSelectors } from '../../../../store/signal.store.selectors';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { TranslatePipe } from '../../../../pipes/translate.pipe';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatButton,
    MatProgressBar,
    MatCard,
    MatCardContent,
    ReactiveFormsModule,
    MatSelect,
    MatOption,
    MatChipListbox,
    MatChipOption,
    RouterLink,
    AsyncPipe,
    DatePipe,
    KeyValuePipe,
    TranslatePipe,
  ],
})
export class OrderDetailComponent {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private location = inject(Location);
  translate = inject(TranslateService);

  readonly type = input.required<string>();

  order$: Signal<Order | null>;
  statusForm: FormGroup;
  orderId!: string;
  statusOptions = OrderStatus;
  showForm = false;
  lang$: Observable<string>;

  constructor() {
    this.lang$ = this.translate.getLang$();

    this.statusForm = this.fb.group({
      status: ['', Validators.required],
    });

    combineLatest([
      toObservable(this.selectors.user).pipe(filter((user) => !!user)),
      this.route.params.pipe(map((params) => params['id'])),
    ]).subscribe(([_user, id]) => {
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
    const status = this.statusForm.get('status')!.value;
    this.store.updateOrder({
      orderId: this.orderId,
      status,
    });
  }

  goBack(): void {
    this.location.back();
  }
}

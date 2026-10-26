import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { OrderDetailComponent } from '../../../order/components/order-detail/order-detail.component';
import { AdminPageHeaderComponent } from '../../admin-ui/admin-page-header.component';

/** Admin order detail: status changes and refunds (OrderDetailComponent in EDIT mode) */
@Component({
  selector: 'app-order-edit',
  template: `
    <app-admin-page-header [title]="'Order ' + orderId()" />
    <app-order-detail type="EDIT" />
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OrderDetailComponent, AdminPageHeaderComponent],
})
export class OrderEditComponent {
  readonly orderId = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? '')), { initialValue: '' });
}

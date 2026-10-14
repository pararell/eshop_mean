import { Component, ChangeDetectionStrategy } from '@angular/core';
import { OrderDetailComponent } from '../../../order/components/order-detail/order-detail.component';

@Component({
  selector: 'app-order-edit',
  templateUrl: './order-edit.component.html',
  styleUrls: ['./order-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [OrderDetailComponent],
})
export class OrderEditComponent {
  constructor() {}
}

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { OrderDetailComponent } from '../components/order-detail/order-detail.component';

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [OrderDetailComponent],
})
export class OrderComponent {
  constructor() {}
}

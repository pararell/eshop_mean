import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { Order } from '../../../../shared/models';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class OrdersListComponent {
  @Input() orders: Order[];
  @Input() orderUrl: string;

  constructor() {}
}

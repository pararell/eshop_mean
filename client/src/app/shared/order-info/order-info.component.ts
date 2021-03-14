import { Order } from './../models';

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-order-info',
  templateUrl: './order-info.component.html',
  styleUrls: ['./order-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderInfoComponent {

  @Input() order: Order;
  @Input() lang: string;

  trackById(_index: number, item) {
    return item._id;
  }
}

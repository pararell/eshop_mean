import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatProgressBar } from '@angular/material/progress-bar';

import { Order } from './../../models';
import { TranslatePipe } from '../../../pipes/translate.pipe';

/** An order as a sheet: status, totals, address and items (customer summary, order detail, admin) */
@Component({
  selector: 'app-order-info',
  templateUrl: './order-info.component.html',
  styleUrls: ['./order-info.component.scss'],
  imports: [AsyncPipe, DatePipe, TranslatePipe, RouterLink, MatProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderInfoComponent {
  @Input() order!: Order;
  readonly lang = input.required<string>();
}

import { Component, Input, ChangeDetectionStrategy, input } from '@angular/core';

import { Order } from '../../../../shared/models';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { AsyncPipe, DatePipe } from '@angular/common';
import { TranslatePipe } from '../../../../pipes/translate.pipe';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressBar, RouterLink, AsyncPipe, DatePipe, TranslatePipe],
})
export class OrdersListComponent {
  @Input() orders!: Order[];
  readonly orderUrl = input.required<string>();
}

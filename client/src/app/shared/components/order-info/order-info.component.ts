import { CommonModule } from '@angular/common';
import { Order } from './../../models';

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatProgressBar } from '@angular/material/progress-bar';
import {  MatCardModule } from '@angular/material/card';
import {  MatChipsModule } from '@angular/material/chips';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-info',
  templateUrl: './order-info.component.html',
  styleUrls: ['./order-info.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink, MatProgressBar, MatCardModule, MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderInfoComponent {

  @Input() order: Order;
  @Input() lang: string;

  trackById(_index: number, item) {
    return item._id;
  }
}

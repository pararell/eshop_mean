import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { OrdersListComponent } from './orders-list/orders-list.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { PriceFormatPipe } from '../../../pipes/price.pipe';

@NgModule({
  declarations: [
    OrdersListComponent,
    OrderDetailComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslatePipe,
    PriceFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  exports: [
    OrdersListComponent,
    OrderDetailComponent
  ],
  providers: []
})
export class OrderComponentsModule { }

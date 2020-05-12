import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { OrdersComponent } from './orders.component';
import { OrderComponent } from './order/order.component';
import { SharedModule } from '../../shared/shared.module';
import { PipeModule } from '../../pipes/pipe.module';

@NgModule({
  declarations: [
    OrdersComponent,
    OrderComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    ReactiveFormsModule,
    PipeModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    RouterModule.forChild([
      { path: ':id', component: OrderComponent },
      { path: '', component: OrdersComponent }
    ]),
  ],
  providers: []
})
export class OrderModule { }

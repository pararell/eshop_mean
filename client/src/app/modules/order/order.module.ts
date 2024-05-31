import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { OrdersComponent } from './orders.component';
import { OrderComponent } from './order/order.component';
import { OrderComponentsModule } from './components/order-components.module';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { PriceFormatPipe } from '../../pipes/price.pipe';

@NgModule({
  declarations: [
    OrdersComponent,
    OrderComponent
  ],
  imports: [
    CommonModule,
    OrderComponentsModule,
    ReactiveFormsModule,
    TranslatePipe,
    PriceFormatPipe,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSelectModule,
    RouterModule.forChild([
      { path: ':id', component: OrderComponent },
      { path: '', component: OrdersComponent }
    ]),
  ],
  providers: []
})
export class OrderModule { }

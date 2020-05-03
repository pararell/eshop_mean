import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { CartComponent } from './cart/cart.component';
import { SharedModule } from '../../shared/shared.module';
import { PipeModule } from '../../pipes/pipe.module';

@NgModule({
  declarations: [
    CartComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    PipeModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatProgressBarModule,
    RouterModule.forChild([
      { path: '', component: CartComponent }
    ]),
  ],
  providers: []
})
export class CartModule { }


// angular
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// app imports
import { CartComponent } from './cart/cart.component';
import { SharedModule } from './../shared/shared.module';
import { PipeModule } from './../pipes/pipe.module';

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
    RouterModule.forChild([
      { path: '', component: CartComponent }
    ]),
  ],
  providers: []
})
export class CartModule { }

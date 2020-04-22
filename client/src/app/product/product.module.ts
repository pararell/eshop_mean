// angular
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

// app imports
import { ProductComponent } from './product/product.component';
import { LazyModule } from './../utils/lazyLoadImg/lazy.module';
import { SharedModule } from './../shared/shared.module';
import { PipeModule } from './../pipes/pipe.module';

@NgModule({
  declarations: [
    ProductComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    LazyModule,
    ReactiveFormsModule,
    PipeModule,
    RouterModule.forChild([
      { path: ':id', component: ProductComponent },
      { path: '**', redirectTo: 'products' }
    ]),
  ],
  providers: []
})
export class ProductModule { }

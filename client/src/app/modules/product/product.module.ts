import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';

import { ProductComponent } from './product/product.component';
import { LazyModule } from '../../utils/lazyLoadImg/lazy.module';
import { SharedModule } from '../../shared/shared.module';
import { PipeModule } from '../../pipes/pipe.module';
import { ProductsComponent } from './products/products.component';

@NgModule({
  declarations: [
    ProductComponent,
    ProductsComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    LazyModule,
    ReactiveFormsModule,
    PipeModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSidenavModule,
    RouterModule.forChild([
      { path: 'all', component: ProductsComponent },
      { path: 'category/:category', component: ProductsComponent },
      { path: ':id', component: ProductComponent },
    ]),
  ],
  providers: []
})
export class ProductModule { }

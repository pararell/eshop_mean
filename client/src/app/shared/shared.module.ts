import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';

import { PipeModule } from '../pipes/pipe.module';
import { LazyModule } from '../utils/lazyLoadImg/lazy.module';
import { CardComponent } from './card/card.component';
import { CartShowComponent } from './cart-show/cart-show.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ProductsListComponent } from './products-list/products-list.component';
import { PaginationComponent } from './pagination/pagination.component';
import { ImagesDialogComponent } from './images-dialog/images-dialog.component';


@NgModule({
  declarations: [
    CardComponent,
    CartShowComponent,
    SidebarComponent,
    ProductsListComponent,
    PaginationComponent,
    ImagesDialogComponent
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    LazyModule,
    PipeModule,
    MatCardModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule
  ],
  providers: [],
  exports: [
    CardComponent,
    CartShowComponent,
    SidebarComponent,
    ProductsListComponent,
    PaginationComponent,
    ImagesDialogComponent
  ]
})
export class SharedModule { }

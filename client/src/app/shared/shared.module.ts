import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { PipeModule } from '../pipes/pipe.module';
import { CartShowComponent } from './cart-show/cart-show.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ProductsListComponent } from './products-list/products-list.component';
import { PaginationComponent } from './pagination/pagination.component';
import { ImagesDialogComponent } from './images-dialog/images-dialog.component';
import { ProductContentComponent } from './product-content/product-content.component';
import { OrderInfoComponent } from './order-info/order-info.component';


@NgModule({
  declarations: [
    CartShowComponent,
    SidebarComponent,
    ProductsListComponent,
    ProductContentComponent,
    PaginationComponent,
    ImagesDialogComponent,
    OrderInfoComponent
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    PipeModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    MatCardModule,
    MatSnackBarModule
  ],
  providers: [],
  exports: [
    CartShowComponent,
    SidebarComponent,
    ProductsListComponent,
    ProductContentComponent,
    PaginationComponent,
    ImagesDialogComponent,
    OrderInfoComponent
  ]
})
export class SharedModule { }

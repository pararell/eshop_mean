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

import { PipeModule } from '../pipes/pipe.module';
import { LazyModule } from '../utils/lazyLoadImg/lazy.module';
import { CartShowComponent } from './cart-show/cart-show.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ProductsListComponent } from './products-list/products-list.component';
import { PaginationComponent } from './pagination/pagination.component';
import { ImagesDialogComponent } from './images-dialog/images-dialog.component';
import { CategoriesListComponent } from './categories-list/categories-list.component';
import { CarouselComponent } from './carousel/carousel.component';
import { ProductContentComponent } from './product-content/product-content.component';

@NgModule({
  declarations: [
    CartShowComponent,
    SidebarComponent,
    ProductsListComponent,
    ProductContentComponent,
    CategoriesListComponent,
    PaginationComponent,
    ImagesDialogComponent,
    CarouselComponent
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    LazyModule,
    PipeModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule,
    MatChipsModule
  ],
  providers: [],
  exports: [
    CartShowComponent,
    SidebarComponent,
    ProductsListComponent,
    ProductContentComponent,
    CategoriesListComponent,
    PaginationComponent,
    ImagesDialogComponent,
    CarouselComponent
  ]
})
export class SharedModule { }

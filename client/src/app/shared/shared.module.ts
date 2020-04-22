import { PipeModule } from './../pipes/pipe.module';
import { LazyModule } from './../utils/lazyLoadImg/lazy.module';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';


import { CardComponent } from './card/card.component';
import { CartShowComponent } from './cart-show/cart-show.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ProductsListComponent } from './products-list/products-list.component';
import { PaginationComponent } from './pagination/pagination.component';

@NgModule({
  declarations: [
    CardComponent,
    CartShowComponent,
    SidebarComponent,
    ProductsListComponent,
    PaginationComponent
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    LazyModule,
    PipeModule
  ],
  providers: [],
  exports: [
    CardComponent,
    CartShowComponent,
    SidebarComponent,
    ProductsListComponent,
    PaginationComponent
  ]
})
export class SharedModule { }

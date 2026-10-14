import { Component, Input, ChangeDetectionStrategy, input, output } from '@angular/core';

import { Product } from '../../../shared/models';
import { MatButton } from '@angular/material/button';
import { ProductsListComponent } from '../../../shared/components/products-list/products-list.component';
import { AsyncPipe } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-all-products',
  templateUrl: './all-products.component.html',
  styleUrls: ['./all-products.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatButton, ProductsListComponent, AsyncPipe, TranslatePipe],
})
export class AllProductsComponent {
  @Input() allProducts!: Product[];
  readonly lang = input.required<string>();
  readonly currency = input.required<string>();

  readonly getAllProducts = output();
  readonly editProduct = output<string>();

  constructor() {}
}

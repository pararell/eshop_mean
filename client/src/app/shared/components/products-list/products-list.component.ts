import { Component, Input, ChangeDetectionStrategy, input, output } from '@angular/core';

import { Product } from '../../models';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { CartShowComponent } from '../cart-show/cart-show.component';
import { PriceFormatPipe } from '../../../pipes/price.pipe';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss'],
  imports: [AsyncPipe, NgOptimizedImage, TranslatePipe, PriceFormatPipe, RouterLink, CartShowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsListComponent {
  readonly products = input<Product[]>([]);
  @Input() cartIds!: { [productId: string]: number };
  readonly currency = input.required<string>();
  readonly lang = input.required<string>();
  readonly showEdit = input(false);
  readonly addProduct = output<string>();
  readonly removeProduct = output<string>();
  readonly editProduct = output<string>();

  constructor() {}

  onAddProduct(id: string): void {
    this.addProduct.emit(id);
  }

  onRemoveProduct(id: string): void {
    this.removeProduct.emit(id);
  }

  onEditProduct(id: string): void {
    this.editProduct.emit(id);
  }
}

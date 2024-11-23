import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, input, computed } from '@angular/core';

import { Product, Category } from '../../models';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';
import { PriceFormatPipe } from '../../../pipes/price.pipe';

import { MatChipsModule } from '@angular/material/chips';
import { CartShowComponent } from '../cart-show/cart-show.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-product-content',
    templateUrl: './product-content.component.html',
    styleUrls: ['./product-content.component.scss'],
    imports: [CommonModule, TranslatePipe, RouterLink, PriceFormatPipe, MatChipsModule, CartShowComponent, MatButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductContentComponent {
  categoriesInput = input<Category[]>();
  categoriesToShow = computed(() => (this.categoriesInput() || []).reduce((prev, cat) => ({...prev, [cat.titleUrl]: cat.title }), {}));
  @Input()  product    : Product;
  @Input()  cartIds     : {[productId: string]: number};
  @Input()  currency    : string;
  @Input()  lang        : string;
  @Input()  withLink      = false;

  @Output() addProduct     = new EventEmitter<string>();
  @Output() removeProduct  = new EventEmitter<string>();


  constructor() {}

  onAddProduct(id: string): void {
    this.addProduct.emit(id);
  }

  onRemoveProduct(id: string): void {
    this.removeProduct.emit(id);
  }

  trackById(_index: number, item: Product) {
    return item._id;
  }
}

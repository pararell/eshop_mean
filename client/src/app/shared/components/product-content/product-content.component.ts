import { Component, Input, ChangeDetectionStrategy, input, computed, output } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Product, Category } from '../../models';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { PriceFormatPipe } from '../../../pipes/price.pipe';
import { CartShowComponent } from '../cart-show/cart-show.component';
import { IconComponent } from '../icon/icon.component';

/** Product detail buy box: categories, title, price, stock, add to cart, shop benefits */
@Component({
  selector: 'app-product-content',
  templateUrl: './product-content.component.html',
  styleUrls: ['./product-content.component.scss'],
  imports: [AsyncPipe, TranslatePipe, RouterLink, PriceFormatPipe, CartShowComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductContentComponent {
  categoriesInput = input<Category[]>();
  categoriesToShow = computed(() =>
    (this.categoriesInput() || []).reduce<Record<string, string>>((prev, cat) => ({ ...prev, [cat.titleUrl]: cat.title }), {}),
  );
  @Input() product!: Product;
  @Input() cartIds!: { [productId: string]: number };
  readonly currency = input.required<string>();
  readonly lang = input.required<string>();
  /** Free-shipping threshold from the cart; hidden when unknown */
  readonly shippingLimit = input<number | undefined>();

  readonly addProduct = output<string>();
  readonly removeProduct = output<string>();

  onAddProduct(id: string): void {
    this.addProduct.emit(id);
  }

  onRemoveProduct(id: string): void {
    this.removeProduct.emit(id);
  }
}

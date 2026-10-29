import { Component, Input, ChangeDetectionStrategy, computed, input, output } from '@angular/core';

import { Product } from '../../models';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';
import { AsyncPipe, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { CartShowComponent } from '../cart-show/cart-show.component';
import { PriceFormatPipe } from '../../../pipes/price.pipe';
import { listingGrid, TileView } from '../../listing';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss'],
  imports: [AsyncPipe, NgOptimizedImage, NgTemplateOutlet, TranslatePipe, PriceFormatPipe, RouterLink, CartShowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsListComponent {
  readonly products = input<Product[]>([]);
  @Input() cartIds!: { [productId: string]: number };
  readonly currency = input.required<string>();
  readonly lang = input.required<string>();
  readonly showEdit = input(false);
  /** Listing pages: a large first card, and editorial tiles after every `tileEvery` products */
  readonly featured = input<Product | null>(null);
  readonly tiles = input<TileView[]>([]);
  readonly tileEvery = input<number | undefined>(undefined);
  readonly page = input(1);
  readonly perPage = input(12);
  readonly addProduct = output<string>();
  readonly removeProduct = output<string>();
  readonly editProduct = output<string>();

  readonly items = computed(() =>
    listingGrid(this.products(), {
      featured: this.featured(),
      tiles: this.tiles(),
      every: this.tileEvery(),
      page: this.page(),
      perPage: this.perPage(),
    }),
  );

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

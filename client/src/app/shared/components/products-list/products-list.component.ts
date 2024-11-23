import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { Product } from '../../models';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartShowComponent } from '../cart-show/cart-show.component';
import { PriceFormatPipe } from '../../../pipes/price.pipe';

@Component({
    selector: 'app-products-list',
    templateUrl: './products-list.component.html',
    styleUrls: ['./products-list.component.scss'],
    imports: [CommonModule, TranslatePipe, PriceFormatPipe, RouterLink, CartShowComponent],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListComponent {
  @Input()  products    : Product[] = [];
  @Input()  cartIds     : {[productId: string]: number};
  @Input()  currency    : string;
  @Input()  lang        : string;
  @Input()  showEdit    = false;
  @Output() addProduct     = new EventEmitter<string>();
  @Output() removeProduct  = new EventEmitter<string>();
  @Output() editProduct    = new EventEmitter<string>();


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

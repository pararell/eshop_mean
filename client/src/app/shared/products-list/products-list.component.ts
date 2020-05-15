import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { Product } from '../models';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListComponent {
  @Input()  products    : Product[];
  @Input()  cartIds     : {[productId: string]: number};
  @Input()  convertVal  : number;
  @Input()  currency    : string;
  @Input()  lang        : string;
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

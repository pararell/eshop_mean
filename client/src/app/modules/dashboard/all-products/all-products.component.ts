import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { Product } from '../../../shared/models';

@Component({
  selector: 'app-all-products',
  templateUrl: './all-products.component.html',
  styleUrls: ['./all-products.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class AllProductsComponent {
  @Input() allProducts!: Product[];
  @Input() lang!: string;
  @Input() currency!: string;

  @Output() getAllProducts = new EventEmitter();
  @Output() editProduct = new EventEmitter<string>();

  constructor() {}
}

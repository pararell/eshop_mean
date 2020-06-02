import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { Product } from '../../../shared/models';


@Component({
  selector: 'app-all-products',
  templateUrl: './all-products.component.html',
  styleUrls: ['./all-products.component.scss']
})
export class AllProductsComponent {
  allProduct$ : Observable<Product[]>;
  getProductsSub: Subscription;
  currency$   : Observable<string>;
  lang$       : Observable<string>;

  @Input() allProducts: Product[];
  @Input() lang: string;
  @Input() currency: string;

  @Output() getAllProducts = new EventEmitter();
  @Output() editProduct = new EventEmitter<string>();

  constructor() {
  }

}

import { filter } from 'rxjs/operators';
import { TranslateService } from './../../services/translate.service';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListComponent {
  @Input()  products:  any;
  @Input()  cartIds:   any;
  @Input()  convertVal : number;
  @Input()  currency: string;
  @Output() addProduct:    EventEmitter<any> = new EventEmitter<any>();
  @Output() removeProduct: EventEmitter<any> = new EventEmitter<any>();

  productUrl: string;

  constructor(private translate: TranslateService) {
    this.translate.translationsSub$
      .pipe(filter(Boolean))
      .subscribe(translations => {
        this.productUrl = '/' + this.translate.lang + '/' + (translations['product'] || 'product');
      });
  }

  onAddProduct(id) {
    this.addProduct.emit(id);
  }

  onRemoveProduct(id) {
    this.removeProduct.emit(id);
  }

  trackById(index, item) {
    return item._id;

  }
}

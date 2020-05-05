import { Component } from '@angular/core';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions'
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { Product } from 'src/app/shared/models';

@Component({
  selector: 'app-all-products',
  templateUrl: './all-products.component.html',
  styleUrls: ['./all-products.component.scss']
})
export class AllProductsComponent  {
  allProduct$ : Observable<Product[]>;
  convertVal$ : Observable<number>;
  currency$   : Observable<string>;
  lang        : string;

  constructor(private store: Store<fromRoot.State>) {

    this.getAllProducts();
    this.convertVal$    = this.store.select(fromRoot.getConvertVal);
    this.currency$      = this.store.select(fromRoot.getCurrency);
    this.allProduct$    = this.store.select(fromRoot.getAllProducts);
  }

  getProducts(): void {
    this.getAllProducts();
  }

  private getAllProducts(): void {
    this.store.select(fromRoot.getLang)
    .pipe(filter(Boolean), take(1))
    .subscribe((lang: string) => {
      this.lang = lang;
      this.store.dispatch(new actions.GetAllProducts(lang));
    });
  }



}

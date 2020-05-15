import { Component, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { Product } from '../../../shared/models';
import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions'
import { TranslateService } from '../../../services/translate.service';

@Component({
  selector: 'app-all-products',
  templateUrl: './all-products.component.html',
  styleUrls: ['./all-products.component.scss']
})
export class AllProductsComponent implements OnDestroy {
  allProduct$ : Observable<Product[]>;
  getProductsSub: Subscription;
  convertVal$ : Observable<number>;
  currency$   : Observable<string>;
  lang$       : Observable<string>;

  constructor(private store: Store<fromRoot.State>, private translate: TranslateService) {

    this.lang$          = this.translate.getLang$().pipe(filter((lang: string) => !!lang));
    this.getAllProducts();
    this.convertVal$    = this.store.select(fromRoot.getConvertVal);
    this.currency$      = this.store.select(fromRoot.getCurrency);
    this.allProduct$    = this.store.select(fromRoot.getAllProducts);
  }

  getProducts(): void {
    this.store.dispatch(new actions.GetAllProducts());
  }

  ngOnDestroy(): void {
    this.getProductsSub.unsubscribe();
  }

  private getAllProducts(): void {
    this.getProductsSub = this.lang$
      .subscribe((lang: string) => {
        this.store.dispatch(new actions.GetAllProducts());
    });
  }



}

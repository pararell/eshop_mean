import { Component, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';

import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions'
import { TranslateService } from '../../../services/translate.service';
import { Product } from '../../../shared/models';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnDestroy {

  productAction = '';
  lang$: Observable<string>;
  convertVal$ : Observable<number>;
  currency$   : Observable<string>;
  allProducts$ : Observable<Product[]>;
  allProductsTitles$: Observable<string[]>;
  getProductsSub: Subscription;
  activeTab: number;

  readonly component = 'dashboard';

  constructor(private translate: TranslateService, private store: Store<fromRoot.State>) {
    this.lang$          = this.translate.getLang$();
    this.convertVal$    = this.store.select(fromRoot.getConvertVal);
    this.currency$      = this.store.select(fromRoot.getCurrency);
    this.allProducts$    = this.store.select(fromRoot.getAllProducts);
    this.allProductsTitles$    = this.store.select(fromRoot.getAllProducts).pipe(
      map((products : Product[]) => products.map(product => product.titleUrl)));
    this.getAllProducts();
  }

  changeAction(action: string): void {
    this.productAction = this.productAction === action ? '' : action;
  }

  getProducts(): void {
    this.store.dispatch(new actions.GetAllProducts());
  }

  changeTab(tab: number) {
    this.activeTab = tab;
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

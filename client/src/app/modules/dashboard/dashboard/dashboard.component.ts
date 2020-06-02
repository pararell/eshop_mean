import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { map } from 'rxjs/operators';

import * as fromRoot from '../../../store/reducers';
import * as actions from '../../../store/actions'
import { TranslateService } from '../../../services/translate.service';
import { Product } from '../../../shared/models';
import { MatTabGroup } from '@angular/material/tabs';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnDestroy {

  @ViewChild(MatTabGroup) tabGroup: MatTabGroup;

  productAction = '';
  lang$: Observable<string>;
  currency$   : Observable<string>;
  allProducts$ : Observable<Product[]>;
  allProductsTitles$: Observable<string[]>;
  getProductsSub: Subscription;
  productToEditTitleUrl: string;

  readonly component = 'dashboard';

  constructor(private translate: TranslateService, private store: Store<fromRoot.State>) {
    this.lang$          = this.translate.getLang$();
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

  setToEditProduct(titleUrl: string): void {
    this.productToEditTitleUrl = titleUrl;
    this.tabGroup.selectedIndex = 2;
    this.store.dispatch(new actions.UpdatePosition({ dashboard: 0 }));
  }

  changeTab(tab: number) {
    this.tabGroup.selectedIndex = tab;
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

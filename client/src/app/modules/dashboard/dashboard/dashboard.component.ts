import { Component, OnDestroy, Signal, ViewChild } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { TranslateService } from '../../../services/translate.service';
import { Product } from '../../../shared/models';
import { MatTabGroup } from '@angular/material/tabs';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { toObservable } from '@angular/core/rxjs-interop';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnDestroy {

  @ViewChild(MatTabGroup) tabGroup: MatTabGroup;

  productAction = '';
  lang$: Observable<string>;
  currency$   : Signal<string>;
  allProducts$ : Signal<Product[]>;
  allProductsTitles$: Observable<string[]>;
  getProductsSub: Subscription;
  productToEditTitleUrl: string;

  readonly component = 'dashboard';

  constructor(private translate: TranslateService, private store: SignalStore, private selectors: SignalStoreSelectors) {
    this.lang$          = this.translate.getLang$();
    this.currency$      = this.selectors.currency;
    this.allProducts$    = this.selectors.allProducts;
    this.allProductsTitles$    = toObservable(this.selectors.allProducts).pipe(
      map((products : Product[]) => products.map(product => product.titleUrl)));
    this.getAllProducts();
  }

  changeAction(action: string): void {
    this.productAction = this.productAction === action ? '' : action;
  }

  getProducts(): void {
    this.store.getAllProducts();
  }

  setToEditProduct(titleUrl: string): void {
    this.productToEditTitleUrl = titleUrl;
    this.tabGroup.selectedIndex = 2;
    this.store.updatePosition({ dashboard: 0 });
  }

  changeTab(tab: number) {
    this.tabGroup.selectedIndex = tab;
    this.store.getAllProducts();
  }

  ngOnDestroy(): void {
    this.getProductsSub.unsubscribe();
  }

  private getAllProducts(): void {
    this.getProductsSub = this.lang$
      .subscribe((lang: string) => {
        this.store.getAllProducts();
    });
  }

}

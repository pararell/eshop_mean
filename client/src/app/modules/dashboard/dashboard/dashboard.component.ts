import { Component, OnDestroy, Signal, ChangeDetectionStrategy, inject, viewChild } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { TranslateService } from '../../../services/translate.service';
import { Product } from '../../../shared/models';
import { MatTabGroup, MatTab, MatTabContent } from '@angular/material/tabs';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AllProductsComponent } from '../all-products/all-products.component';
import { ProductsEditComponent } from '../products-edit/products-edit.component';
import { CategoriesEditComponent } from '../categories-edit/categories-edit.component';
import { PagesEditComponent } from '../pages-edit/pages-edit.component';
import { ThemeEditComponent } from '../theme-edit/theme-edit.component';
import { ConfigEditComponent } from '../config-edit/config-edit.component';
import { TranslationsEditComponent } from '../translations-edit/translations-edit.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatButton,
    RouterLink,
    MatTabGroup,
    MatTab,
    AllProductsComponent,
    MatTabContent,
    ProductsEditComponent,
    CategoriesEditComponent,
    PagesEditComponent,
    ThemeEditComponent,
    ConfigEditComponent,
    TranslationsEditComponent,
    AsyncPipe,
  ],
})
export class DashboardComponent implements OnDestroy {
  private translate = inject(TranslateService);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);

  readonly tabGroup = viewChild.required(MatTabGroup);

  productAction = '';
  lang$: Observable<string>;
  currency$: Signal<string>;
  allProducts$: Signal<Product[]>;
  allProductsTitles$: Observable<string[]>;
  getProductsSub!: Subscription;
  productToEditTitleUrl!: string;

  readonly component = 'dashboard';

  constructor() {
    this.lang$ = this.translate.getLang$();
    this.currency$ = this.selectors.currency;
    this.allProducts$ = this.selectors.allProducts;
    this.allProductsTitles$ = toObservable(this.selectors.allProducts).pipe(
      map((products: Product[]) => products.map((product) => product.titleUrl)),
    );
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
    this.tabGroup().selectedIndex = 2;
    this.store.updatePosition({ dashboard: 0 });
  }

  changeTab(tab: number) {
    this.tabGroup().selectedIndex = tab;
    this.store.getAllProducts();
  }

  ngOnDestroy(): void {
    this.getProductsSub.unsubscribe();
  }

  private getAllProducts(): void {
    this.getProductsSub = this.lang$.subscribe((_lang: string) => {
      this.store.getAllProducts();
    });
  }
}

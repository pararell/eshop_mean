import { filter, map, take, distinctUntilChanged, skip } from 'rxjs/operators';
import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Location } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';

import * as actions from '../../../store/actions';
import * as fromRoot from '../../../store/reducers';
import { Cart, Product, Category } from '../../../shared/models';
import { ImagesDialogComponent } from '../../../shared/images-dialog/images-dialog.component';
import { TranslateService } from '../../../services/translate.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
})
export class ProductComponent implements OnDestroy {
  items$: Observable<{ product: Product; cartIds: { [productId: string]: number } }>;
  categories$: Observable<Category[]>;
  productLoading$: Observable<boolean>;
  currency$: Observable<string>;
  lang$: Observable<string>;
  routeSub: Subscription;
  categoriesSub: Subscription;

  constructor(
    private route: ActivatedRoute,
    private store: Store<fromRoot.State>,
    private location: Location,
    private meta: Meta,
    private title: Title,
    public dialog: MatDialog,
    private translate: TranslateService
  ) {
    this.lang$ = this.translate.getLang$();
    this.categories$ = this.store.select(fromRoot.getCategories);

    this.routeSub = combineLatest(this.lang$, this.route.params.pipe(map((params) => params['id'])), (lang, id) => ({
      lang,
      id,
    })).subscribe(({ lang, id }) => {
      this.store.dispatch(new actions.GetProduct(id + '?lang=' + lang));
    });

    this.callCategories();

    this.setMetaData();
    this.productLoading$ = this.store.select(fromRoot.getProductLoading);

    this.items$ = combineLatest(
      this.store.select(fromRoot.getProduct),
      this.store.select(fromRoot.getCart).pipe(
        filter(Boolean),
        map((cart: Cart) => cart.items)
      ),
      (product, cartItems) => {
        return {
          product,
          cartIds: cartItems.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.qty }), {}),
        };
      }
    );

    this.currency$ = this.store.select(fromRoot.getCurrency);
  }

  cartEvent(id: string, type: string): void {
    if (type === 'add') {
      this.store.dispatch(new actions.AddToCart('?id=' + id));
    }
    if (type === 'remove') {
      this.store.dispatch(new actions.RemoveFromCart('?id=' + id));
    }
  }

  goBack(): void {
    this.location.back();
  }

  openDialog(index: number, images: string[]): void {
    const dialogRef = this.dialog.open(ImagesDialogComponent, {
      width: '100vw',
      maxHeight: '100vh',
      data: { index, images },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log('The dialog was closed');
    });
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
    this.categoriesSub.unsubscribe();
  }

  private callCategories(): void {
    combineLatest(this.categories$.pipe(take(1)), this.lang$.pipe(take(1)), (categories, lang) => ({
      categories,
      lang,
    }))
      .pipe(take(1))
      .subscribe(({ categories, lang }) => {
        if (!categories.length) {
          this.store.dispatch(new actions.GetCategories(lang));
        }
      });

    this.categoriesSub = this.lang$.pipe(distinctUntilChanged(), skip(1)).subscribe((lang: string) => {
      this.store.dispatch(new actions.GetCategories(lang));
    });
  }

  private setMetaData(): void {
    this.store
      .select(fromRoot.getProduct)
      .pipe(
        filter((product: Product) => !!product && !!product.title),
        take(1)
      )
      .subscribe((product) => {
        this.title.setTitle(product.title);
        this.meta.updateTag({ name: 'description', content: product.description });
      });
  }
}

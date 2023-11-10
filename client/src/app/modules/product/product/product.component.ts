import { JsonLDService } from './../../../services/jsonLD.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, map, take, distinctUntilChanged, skip, withLatestFrom } from 'rxjs/operators';
import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  categories$: Observable<Category[]>;
  productLoading$: Observable<boolean>;
  currency$: Observable<string>;
  lang$: Observable<string>;
  routeSub: Subscription;
  categoriesSub: Subscription;
  product$: Observable<Product>;
  cartIds$: Observable<{ [productId: string]: number }>;

  constructor(
    private route: ActivatedRoute,
    private store: Store<fromRoot.State>,
    private location: Location,
    private meta: Meta,
    private title: Title,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private translate: TranslateService,
    private jsonLDService: JsonLDService,
  ) {
    this.lang$ = this.translate.getLang$();
    this.categories$ = this.store.select(fromRoot.getCategories);
    this.routeSub = combineLatest([this.lang$, this.route.params.pipe(map((params) => params['id']))]).subscribe(([lang, id]) => {
      this.store.dispatch(new actions.GetProduct(id + '?lang=' + lang));
    });

    this.currency$ = this.store.select(fromRoot.getCurrency);

    this.callCategories();

    this.setMetaData();
    this.productLoading$ = this.store.select(fromRoot.getProductLoading);
    this.product$ = this.store.select(fromRoot.getProduct);
    this.cartIds$ = this.store.select(fromRoot.getCart).pipe(
      filter(Boolean),
      map((cart: Cart) => cart.items.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.qty }), {})),
    );
  }

  cartEvent(id: string, type: string): void {
    if (type === 'add') {
      this.store.dispatch(new actions.AddToCart('?id=' + id));

      this.translate
        .getTranslations$()
        .pipe(
          map((translations) =>
            translations
              ? { message: translations['ADDED_TO_CART'] || 'Added to cart', action: translations['TO_CART'] || 'To Cart' }
              : { message: 'Added to cart', action: 'To Cart' },
          ),
          take(1),
        )
        .subscribe(({ message, action }) => {
          let snackBarRef = this.snackBar.open(message, action, { duration: 3000 });
          snackBarRef
            .onAction()
            .pipe(withLatestFrom(this.lang$), take(1))
            .subscribe(([_, lang]) => {
              this.router.navigate(['/' + lang + '/cart']);
            });
        });
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
    combineLatest([this.categories$.pipe(take(1)), this.lang$.pipe(take(1))])
      .pipe(take(1))
      .subscribe(([categories, lang]) => {
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
        withLatestFrom(this.currency$),
        take(1),
      )
      .subscribe(([product, currency]) => {
        this.title.setTitle(product.title);
        this.meta.updateTag({ name: 'description', content: product.description });
        const productSchema = {
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.title,
          image: product.mainImage?.url,
          offers: {
            '@type': 'Offer',
            priceCurrency: currency,
            price: product.regularPrice,
            availability: product.stock === 'onStock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
          description: product.description,
        };
        this.jsonLDService.insertSchema(productSchema, 'structured-data-product');
      });
  }
}

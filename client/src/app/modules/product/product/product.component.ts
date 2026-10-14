import { toObservable } from '@angular/core/rxjs-interop';
import { JsonLDService } from './../../../services/jsonLD.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, map, take, distinctUntilChanged, skip, withLatestFrom } from 'rxjs/operators';
import { Component, OnDestroy, Signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { Location, AsyncPipe } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';

import { Cart, Product, Category } from '../../../shared/models';
import { ImagesDialogComponent } from '../../../shared/components/images-dialog/images-dialog.component';
import { TranslateService } from '../../../services/translate.service';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatCard, MatCardContent } from '@angular/material/card';
import { ProductContentComponent } from '../../../shared/components/product-content/product-content.component';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatButton, MatProgressBar, MatCard, ProductContentComponent, MatTabGroup, MatTab, MatCardContent, AsyncPipe, TranslatePipe],
})
export class ProductComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private location = inject(Location);
  private meta = inject(Meta);
  private title = inject(Title);
  dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private jsonLDService = inject(JsonLDService);

  categories$: Observable<Category[]>;
  productLoading$: Signal<boolean>;
  currency$: Observable<string>;
  lang$: Observable<string>;
  routeSub: Subscription;
  categoriesSub!: Subscription;
  product$: Signal<Product | null>;
  cartIds$: Observable<{ [productId: string]: number }>;

  constructor() {
    this.lang$ = this.translate.getLang$();
    this.categories$ = toObservable(this.selectors.categories);
    this.routeSub = combineLatest([this.lang$, this.route.params.pipe(map((params) => params['id']))]).subscribe(([lang, id]) => {
      this.store.getProduct(id + '?lang=' + lang);
    });

    this.currency$ = toObservable(this.selectors.currency);

    this.callCategories();

    this.setMetaData();
    this.productLoading$ = this.selectors.productLoading;
    this.product$ = this.selectors.product;
    this.cartIds$ = toObservable(this.selectors.cart).pipe(
      filter(Boolean),
      map((cart: Cart) => cart.items.reduce((prev, curr) => ({ ...prev, [curr.id]: curr.qty }), {})),
    );
  }

  cartEvent(id: string, type: string): void {
    if (type === 'add') {
      this.store.addToCart('?id=' + id);

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
          const snackBarRef = this.snackBar.open(message, action, { duration: 3000 });
          snackBarRef
            .onAction()
            .pipe(withLatestFrom(this.lang$), take(1))
            .subscribe(([_, lang]) => {
              this.router.navigate(['/' + lang + '/cart']);
            });
        });
    }
    if (type === 'remove') {
      this.store.removeFromCart('?id=' + id);
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

    dialogRef.afterClosed().subscribe((_result) => {
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
          this.store.getCategories(lang);
        }
      });

    this.categoriesSub = this.lang$.pipe(distinctUntilChanged(), skip(1)).subscribe((lang: string) => {
      this.store.getCategories(lang);
    });
  }

  private setMetaData(): void {
    toObservable(this.selectors.product)
      .pipe(
        filter((product): product is Product => !!product && !!product.title),
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

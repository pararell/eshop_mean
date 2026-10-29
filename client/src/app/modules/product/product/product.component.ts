import { toObservable } from '@angular/core/rxjs-interop';
import { JsonLDService } from './../../../services/jsonLD.service';
import { SeoService } from '../../../services/seo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, map, take, distinctUntilChanged, skip, withLatestFrom } from 'rxjs/operators';
import { Component, OnDestroy, Signal, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { Location, AsyncPipe } from '@angular/common';

import { Cart, Product, Category } from '../../../shared/models';
import { ProductGalleryComponent } from '../../../shared/components/product-gallery/product-gallery.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TranslateService } from '../../../services/translate.service';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ProductContentComponent } from '../../../shared/components/product-content/product-content.component';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatProgressBar, ProductContentComponent, ProductGalleryComponent, IconComponent, RouterLink, AsyncPipe, TranslatePipe],
})
export class ProductComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private location = inject(Location);
  private seo = inject(SeoService);
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
  /** Main image first, then the gallery images, without duplicates */
  readonly galleryImages = computed(() => {
    const product = this.selectors.product();
    if (!product) return [];
    return [...new Set([product.mainImage?.url, ...(product.images ?? [])].filter((url): url is string => !!url))];
  });
  readonly shippingLimit = computed(() => this.selectors.cart()?.shippingLimit);

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
        // SEO fields from the admin editor; empty ones fall back to the title / short description
        this.seo.setPage({
          title: product.seoTitle || product.title,
          exactTitle: !!product.seoTitle,
          description: product.metaDescription || product.description,
          image: product.mainImage?.url,
        });
        const productSchema = {
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.title,
          image: product.mainImage?.url,
          offers: {
            '@type': 'Offer',
            priceCurrency: currency,
            // What the customer pays (the regular price is only the struck-through one while on sale)
            price: product.salePrice,
            availability: product.stock === 'onStock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
          description: product.description,
        };
        this.jsonLDService.insertSchema(productSchema, 'structured-data-product');
      });
  }
}

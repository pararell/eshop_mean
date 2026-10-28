import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import type { ProductRowSource } from '@eshop/shared';

import { ApiService } from '../../../services/api.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { ProductsListComponent } from '../../../shared/components/products-list/products-list.component';

/** One row on wide screens */
const ROW_SIZE = 4;

/**
 * A home "product row": the newest products, those on sale or one category's. It loads its own list
 * (not the shared product list of the store, which the product pages use) and hides itself when empty.
 */
@Component({
  selector: 'app-home-product-row',
  templateUrl: './home-product-row.component.html',
  styleUrls: ['./home-product-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterLink, TranslatePipe, ProductsListComponent],
})
export class HomeProductRowComponent {
  private api = inject(ApiService);

  readonly sectionId = input.required<string>();
  readonly source = input.required<ProductRowSource>();
  readonly category = input('');
  /** The section's own title in this language; empty = a title from the source */
  readonly title = input('');
  /** The category's name, the title of a category row without its own */
  readonly categoryTitle = input('');
  readonly lang = input.required<string>();
  readonly currency = input.required<string>();
  readonly cartIds = input<{ [productId: string]: number }>({});

  readonly addProduct = output<string>();
  readonly removeProduct = output<string>();

  private readonly list = rxResource({
    params: () => ({ lang: this.lang(), source: this.source(), category: this.category() }),
    stream: ({ params }) =>
      this.api.getProducts({
        lang: params.lang,
        page: 1,
        sort: 'newest',
        category: params.source === 'category' ? params.category : undefined,
        onSale: params.source === 'sale',
      }),
  });

  readonly products = computed(() => {
    const result = this.list.hasValue() ? this.list.value() : undefined;
    return result && !result.error ? result.products.slice(0, ROW_SIZE) : [];
  });

  /** A translation key when the section has no title of its own */
  readonly titleKey = computed(() => (this.source() === 'sale' ? 'Sale' : 'New_arrivals'));

  /** Where "View all" goes; none for products on sale (there is no such list page) */
  readonly moreLink = computed(() => {
    if (this.source() === 'newest') return `/${this.lang()}/product/all`;
    if (this.source() === 'category' && this.category()) return `/${this.lang()}/product/category/${this.category()}`;
    return null;
  });
}

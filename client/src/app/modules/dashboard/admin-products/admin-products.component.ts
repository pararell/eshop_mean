import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { Product } from '../../../shared/models';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';

type Visibility = 'all' | 'visible' | 'hidden' | 'incomplete';

/** Admin product table: search, filter, sort, page; a row opens the editor */
@Component({
  selector: 'app-admin-products',
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    UpperCasePipe,
    MatButton,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatIcon,
    MatInput,
    MatSelect,
    MatOption,
    MatPaginator,
    MatSort,
    MatSortHeader,
    MatTableModule,
    AdminPageHeaderComponent,
  ],
})
export class AdminProductsComponent implements OnInit {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly lang = this.selectors.appLang;
  readonly currency = this.selectors.currency;
  /** The store holds the raw response, which is an `{ error }` object when loading failed (e.g. during SSR) */
  readonly products = computed(() => {
    const list = this.selectors.allProducts();
    return Array.isArray(list) ? list : [];
  });

  readonly search = signal('');
  readonly category = signal('');
  readonly visibility = signal<Visibility>('all');
  readonly sort = signal<Sort>({ active: 'dateAdded', direction: 'desc' });
  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);

  readonly columns = ['image', 'title', 'categories', 'price', 'stock', 'visibility'];

  readonly categories = computed(() => [...new Set(this.products().flatMap((p) => p.tags ?? []))].sort());

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.category();
    const visibility = this.visibility();
    return this.products().filter((p) => {
      if (query && !`${p.title ?? ''} ${p.titleUrl}`.toLowerCase().includes(query)) return false;
      if (category && !(p.tags ?? []).includes(category)) return false;
      if (visibility === 'visible' && !p.visibility) return false;
      if (visibility === 'hidden' && p.visibility) return false;
      if (visibility === 'incomplete' && !this.isIncomplete(p)) return false;
      return true;
    });
  });

  readonly sorted = computed(() => {
    const { active, direction } = this.sort();
    if (!direction) return this.filtered();
    const factor = direction === 'asc' ? 1 : -1;
    const key = (p: Product): string | number => {
      switch (active) {
        case 'title':
          return (p.title || p.titleUrl).toLowerCase();
        case 'price':
          return p.salePrice ?? -1;
        default:
          return p.dateAdded ? new Date(p.dateAdded).getTime() : 0;
      }
    };
    return [...this.filtered()].sort((a, b) => (key(a) > key(b) ? factor : key(a) < key(b) ? -factor : 0));
  });

  readonly page = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });

  constructor() {
    // `?q=` from the admin top-bar search
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const q = params.get('q');
      if (q !== null) {
        this.search.set(q);
        this.resetPage();
      }
    });
  }

  ngOnInit(): void {
    this.store.getAllProducts();
  }

  /** Missing title or price in the current language */
  isIncomplete(product: Product): boolean {
    return !product.title || !product.salePrice;
  }

  editLink(product: Product): string[] {
    return [`/${this.lang()}/dashboard/products`, product.titleUrl];
  }

  open(product: Product): void {
    void this.router.navigate(this.editLink(product));
  }

  resetPage(): void {
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onSort(sort: Sort): void {
    this.sort.set(sort);
    this.resetPage();
  }

  refresh(): void {
    this.store.getAllProducts();
  }

  clearFilters(): void {
    this.search.set('');
    this.category.set('');
    this.visibility.set('all');
    this.resetPage();
  }
}

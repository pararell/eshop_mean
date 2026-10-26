import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';

import { Order, OrderStatus } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';

const STATUS_TONE: Record<string, string> = {
  NEW: 'is-warn',
  PENDING_PAYMENT: 'is-warn',
  PAID: 'is-ok',
  COMPLETED: 'is-ok',
  PAYMENT_FAILED: 'is-bad',
};

/** Admin order list: search, status filter, sorting, paging; a row opens the order */
@Component({
  selector: 'app-orders-edit',
  templateUrl: './orders-edit.component.html',
  styleUrls: ['./orders-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatInput,
    MatSelect,
    MatOption,
    MatPaginator,
    MatSort,
    MatSortHeader,
    MatTableModule,
    MatIcon,
    DatePipe,
    AdminPageHeaderComponent,
  ],
})
export class OrdersEditComponent {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private router = inject(Router);

  readonly lang = this.selectors.appLang;
  readonly statuses = Object.values(OrderStatus);
  readonly columns = ['orderId', 'date', 'customer', 'payment', 'amount', 'status'];

  readonly orders = computed(() => {
    const list = this.selectors.orders();
    return Array.isArray(list) ? list : [];
  });
  readonly search = signal('');
  readonly status = signal('');
  readonly sort = signal<Sort>({ active: 'date', direction: 'desc' });
  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);

  readonly toHandle = computed(() => this.orders().filter((order) => order.status === 'NEW' || order.status === 'PAID').length);

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.orders().filter(
      (order) =>
        (!this.status() || order.status === this.status()) &&
        (!query || `${order.orderId} ${order.customerEmail} ${this.customerName(order)}`.toLowerCase().includes(query)),
    );
  });

  readonly sorted = computed(() => {
    const { active, direction } = this.sort();
    if (!direction) return this.filtered();
    const factor = direction === 'asc' ? 1 : -1;
    const key = (order: Order): string | number =>
      active === 'amount' ? Number(order.amount) || 0 : active === 'date' ? this.time(order) : active === 'status' ? order.status : order.orderId;
    return [...this.filtered()].sort((a, b) => (key(a) > key(b) ? factor : key(a) < key(b) ? -factor : 0));
  });

  readonly page = computed(() => this.sorted().slice(this.pageIndex() * this.pageSize(), (this.pageIndex() + 1) * this.pageSize()));

  constructor() {
    this.store.getOrders();
  }

  customerName(order: Order): string {
    return order.addresses?.[0]?.name ?? '';
  }

  time(order: Order): number {
    return order.dateAdded ? new Date(order.dateAdded).getTime() : 0;
  }

  tone(status: string): string {
    return STATUS_TONE[status] ?? '';
  }

  link(order: Order): string[] {
    return ['/', this.lang(), 'dashboard', 'orders', order.orderId];
  }

  open(order: Order): void {
    void this.router.navigate(this.link(order));
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  onSort(sort: Sort): void {
    this.sort.set(sort);
    this.pageIndex.set(0);
  }

  refresh(): void {
    this.store.getOrders();
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import type { AdminOverview } from '@eshop/shared';

import { ApiService } from '../../../services/api.service';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';

const PERIODS = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const;

const STATUS_TONE: Record<string, string> = {
  NEW: 'is-warn',
  PENDING_PAYMENT: 'is-warn',
  PAID: 'is-ok',
  COMPLETED: 'is-ok',
  PAYMENT_FAILED: 'is-bad',
};

interface Bar {
  day: string;
  label: string;
  value: number;
  orders: number;
  /** Bar height, % of the chart's maximum */
  height: number;
  tip: string;
}

/**
 * Admin Overview: sales (per currency, against the previous period), revenue per day, top
 * products, recent orders, what needs attention, AI draft usage. One request per period.
 */
@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe, MatIcon, AdminPageHeaderComponent],
})
export class OverviewComponent {
  private api = inject(ApiService);
  private selectors = inject(SignalStoreSelectors);

  readonly periods = PERIODS;
  readonly lang = this.selectors.appLang;
  readonly days = signal(7);
  readonly data = signal<AdminOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly periodLabel = computed(() => (this.days() === 1 ? 'today' : `the last ${this.days()} days`));
  readonly previousLabel = computed(() => (this.days() === 1 ? 'yesterday' : `the ${this.days()} days before`));

  /** Sales tiles: one per currency that sold (or an empty EUR tile) */
  readonly sales = computed(() => {
    const sales = this.data()?.sales ?? [];
    return sales.length ? sales : [{ currency: 'EUR', revenue: 0, orders: 0, averageOrder: 0, previousRevenue: 0, previousOrders: 0 }];
  });
  readonly orderCount = computed(() => this.sales().reduce((sum, s) => sum + s.orders, 0));
  readonly previousOrderCount = computed(() => this.sales().reduce((sum, s) => sum + s.previousOrders, 0));

  /** Revenue per day, one small chart per currency (different scales are never mixed on one axis) */
  readonly charts = computed(() => {
    const rows = this.data()?.revenueByDay ?? [];
    const currencies = [...new Set(rows.map((row) => row.currency))];
    return currencies.map((currency) => {
      const points = rows.filter((row) => row.currency === currency);
      const max = Math.max(...points.map((p) => p.revenue), 0);
      const bars: Bar[] = points.map((p) => {
        const date = new Date(`${p.day}T12:00:00`);
        return {
          day: p.day,
          label: this.days() === 7 ? date.toLocaleDateString('en-GB', { weekday: 'short' }) : String(date.getDate()),
          value: p.revenue,
          orders: p.orders,
          height: max ? Math.max((p.revenue / max) * 100, p.revenue ? 2 : 0) : 0,
          tip: `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}: ${this.money(p.revenue, currency)} · ${p.orders} ${p.orders === 1 ? 'order' : 'orders'}`,
        };
      });
      return { currency, bars, max, total: points.reduce((sum, p) => sum + p.revenue, 0) };
    });
  });

  readonly attention = computed(() => {
    const a = this.data()?.attention;
    if (!a) return [];
    const langs = (list: { lang: string; count: number }[]) => list.map((e) => `${e.lang.toUpperCase()} ${e.count}`).join(' · ');
    const items: { tone: string; tag: string; text: string; detail?: string; link: string[] }[] = [];
    if (a.unavailableVisible) {
      items.push({
        tone: 'is-bad',
        tag: 'Stock',
        text: `${a.unavailableVisible} visible ${this.plural(a.unavailableVisible, 'product')} marked unavailable`,
        link: this.link('products'),
      });
    }
    if (a.missingLanguage.length) {
      items.push({
        tone: 'is-warn',
        tag: 'Texts',
        text: 'Products without a title in a language',
        detail: langs(a.missingLanguage),
        link: this.link('products'),
      });
    }
    if (a.missingSeo.length) {
      items.push({
        tone: 'is-warn',
        tag: 'SEO',
        text: 'Visible products without a meta description',
        detail: langs(a.missingSeo),
        link: this.link('products'),
      });
    }
    if (a.untranslated.length) {
      items.push({ tone: '', tag: 'UI', text: 'Shop texts not translated', detail: langs(a.untranslated), link: this.link('translations') });
    }
    return items;
  });

  readonly aiSuccess = computed(() => {
    const ai = this.data()?.ai;
    return ai && ai.drafts ? Math.round((ai.ok / ai.drafts) * 100) : 0;
  });

  constructor() {
    this.load();
  }

  setDays(days: number): void {
    if (days === this.days()) return;
    this.days.set(days);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getAdminOverview(this.days()).subscribe((response) => {
      this.loading.set(false);
      const failed = (response as { error?: { message?: string } }).error;
      if (failed) {
        this.error.set(failed.message ?? 'The overview could not be loaded.');
        return;
      }
      this.data.set(response as AdminOverview);
    });
  }

  money(value: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
    } catch {
      return `${value} ${currency}`;
    }
  }

  /** "▲ 12%" against the previous period; '' without a previous value */
  delta(current: number, previous: number): { text: string; tone: string } {
    if (!previous) return { text: current ? 'new' : '', tone: '' };
    const change = Math.round(((current - previous) / previous) * 100);
    if (!change) return { text: '= same', tone: '' };
    return change > 0 ? { text: `▲ ${change}%`, tone: 'up' } : { text: `▼ ${Math.abs(change)}%`, tone: 'down' };
  }

  tone(status: string): string {
    return STATUS_TONE[status] ?? '';
  }

  plural(count: number, word: string): string {
    return count === 1 ? word : `${word}s`;
  }

  link(path: string): string[] {
    return ['/', this.lang(), 'dashboard', ...path.split('/')];
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { AdminOverview, LanguageCode, OrderStatus } from '@eshop/shared';

import { Database, DRIZZLE } from '../db/database.module';
import { languages } from '../shared/constans';

/** Days of the shop are counted in its time zone; EUR (en, sk) is listed first */
const TIME_ZONE = 'Europe/Bratislava';
/** Orders that count as sales: placed (cash on delivery) or paid, also when later refunded (net of refunds) */
const SOLD: OrderStatus[] = ['NEW', 'PAID', 'SHIPPING', 'COMPLETED', 'REFUNDED'];
export const OVERVIEW_DAYS = [1, 7, 30] as const;

type Row = Record<string, unknown>;
const num = (value: unknown) => Number(value ?? 0) || 0;
const money = (value: unknown) => Math.round(num(value) * 100) / 100;

/** Figures for the admin Overview page, read-only, a handful of aggregate queries */
@Injectable()
export class OverviewService {
  constructor(@Inject(DRIZZLE) private db: Database) {}

  private async rows<T extends Row>(query: ReturnType<typeof sql>): Promise<T[]> {
    return (await this.db.execute(query)).rows as T[];
  }

  async overview(days: number): Promise<AdminOverview> {
    const sold = sql.join(
      SOLD.map((status) => sql`${status}`),
      sql`, `,
    );
    // Start of the period: midnight (shop time) `days - 1` days ago, so "1" is today
    const [{ from, previous_from }] = await this.rows<{ from: Date; previous_from: Date }>(sql`
      SELECT p.start AS from, p.start - make_interval(days => ${days}) AS previous_from
      FROM (SELECT (date_trunc('day', now() AT TIME ZONE ${TIME_ZONE}) - make_interval(days => ${days - 1})) AT TIME ZONE ${TIME_ZONE} AS start) p
    `);

    const [sales, [handle], byDay, top, recent, unavailable, missingLanguage, missingSeo, texts, [ai]] = await Promise.all([
      this.rows(sql`
        SELECT currency,
          sum(amount - coalesce(amount_refunded, 0)) FILTER (WHERE created_at >= ${from}) AS revenue,
          count(*) FILTER (WHERE created_at >= ${from}) AS orders,
          sum(amount - coalesce(amount_refunded, 0)) FILTER (WHERE created_at < ${from}) AS previous_revenue,
          count(*) FILTER (WHERE created_at < ${from}) AS previous_orders
        FROM orders
        WHERE status IN (${sold}) AND created_at >= ${previous_from}
        GROUP BY currency
        ORDER BY currency <> 'EUR', currency
      `),
      this.rows(sql`SELECT count(*) AS count FROM orders WHERE status IN ('NEW', 'PAID')`),
      this.rows(sql`
        SELECT to_char(created_at AT TIME ZONE ${TIME_ZONE}, 'YYYY-MM-DD') AS day, currency,
          sum(amount - coalesce(amount_refunded, 0)) AS revenue, count(*) AS orders
        FROM orders
        WHERE status IN (${sold}) AND created_at >= ${from}
        GROUP BY 1, 2
      `),
      this.rows(sql`
        SELECT item -> 'item' ->> 'titleUrl' AS title_url, max(item -> 'item' ->> 'title') AS title, o.currency,
          sum((item ->> 'qty')::numeric) AS qty, sum((item ->> 'qty')::numeric * (item ->> 'price')::numeric) AS revenue
        FROM orders o, jsonb_array_elements(o.cart -> 'items') AS item
        WHERE o.status IN (${sold}) AND o.created_at >= ${from}
        GROUP BY 1, 3
        ORDER BY revenue DESC
        LIMIT 5
      `),
      this.rows(sql`
        SELECT order_number, created_at, addresses -> 0 ->> 'name' AS name, customer_email, amount, currency, status
        FROM orders ORDER BY created_at DESC LIMIT 5
      `),
      this.rows(sql`SELECT count(DISTINCT product_id) AS count FROM product_translations WHERE visibility AND stock = 'unavailable'`),
      this.rows(sql`
        SELECT l.lang, count(p.id) FILTER (WHERE t.title IS NULL OR t.title = '') AS count
        FROM products p CROSS JOIN unnest(enum_range(NULL::lang_code)) AS l(lang)
        LEFT JOIN product_translations t ON t.product_id = p.id AND t.lang = l.lang
        GROUP BY l.lang
      `),
      this.rows(sql`
        SELECT lang, count(*) FILTER (WHERE meta_description = '') AS count
        FROM product_translations WHERE visibility GROUP BY lang
      `),
      this.rows<{ lang: LanguageCode; keys: Record<string, string> }>(sql`SELECT lang, keys FROM translations`),
      this.rows(sql`
        SELECT count(*) AS drafts, count(*) FILTER (WHERE status = 'ok') AS ok,
          coalesce(sum(cost_usd), 0) AS cost,
          (SELECT provider || '/' || model FROM ai_usage ORDER BY created_at DESC LIMIT 1) AS last_model
        FROM ai_usage WHERE created_at >= ${from}
      `),
    ]);

    // Every day of the period, also without sales, for each currency that sold (EUR when none)
    const currencies = sales.filter((row) => num(row['orders']) > 0).map((row) => String(row['currency']));
    const dayKeys = await this.rows<{ day: string }>(sql`
      SELECT to_char(d, 'YYYY-MM-DD') AS day
      FROM generate_series(${from}::timestamptz AT TIME ZONE ${TIME_ZONE}, now() AT TIME ZONE ${TIME_ZONE}, interval '1 day') AS d
    `);
    const revenueByDay = (currencies.length ? currencies : ['EUR']).flatMap((currency) =>
      dayKeys.map(({ day }) => {
        const hit = byDay.find((row) => row['day'] === day && row['currency'] === currency);
        return { day, currency, revenue: money(hit?.['revenue']), orders: num(hit?.['orders']) };
      }),
    );

    const perLang = (rows: Row[]) =>
      languages.map((lang) => ({ lang, count: num(rows.find((row) => row['lang'] === lang)?.['count']) })).filter((entry) => entry.count > 0);
    const allKeys = new Set(texts.flatMap((row) => Object.keys(row.keys ?? {})));
    const untranslated = languages
      .map((lang) => {
        const keys = texts.find((row) => row.lang === lang)?.keys ?? {};
        return { lang, count: [...allKeys].filter((key) => !keys[key]?.trim()).length };
      })
      .filter((entry) => entry.count > 0);

    return {
      days,
      from: new Date(from).toISOString(),
      previousFrom: new Date(previous_from).toISOString(),
      sales: sales.map((row) => {
        const orders = num(row['orders']);
        const revenue = money(row['revenue']);
        return {
          currency: String(row['currency']),
          revenue,
          orders,
          averageOrder: orders ? money(revenue / orders) : 0,
          previousRevenue: money(row['previous_revenue']),
          previousOrders: num(row['previous_orders']),
        };
      }),
      toHandle: num(handle?.['count']),
      revenueByDay,
      topProducts: top.map((row) => ({
        titleUrl: String(row['title_url'] ?? ''),
        title: String(row['title'] ?? row['title_url'] ?? ''),
        qty: num(row['qty']),
        revenue: money(row['revenue']),
        currency: String(row['currency']),
      })),
      recentOrders: recent.map((row) => ({
        orderId: String(row['order_number']),
        date: new Date(row['created_at'] as string).toISOString(),
        customer: String(row['name'] ?? ''),
        email: String(row['customer_email']),
        amount: money(row['amount']),
        currency: String(row['currency']),
        status: row['status'] as OrderStatus,
      })),
      attention: {
        unavailableVisible: num(unavailable[0]?.['count']),
        missingLanguage: perLang(missingLanguage),
        missingSeo: perLang(missingSeo),
        untranslated,
      },
      ai: {
        drafts: num(ai?.['drafts']),
        ok: num(ai?.['ok']),
        failed: num(ai?.['drafts']) - num(ai?.['ok']),
        costUsd: Math.round(num(ai?.['cost']) * 10000) / 10000,
        lastModel: ai?.['last_model'] ? String(ai['last_model']) : undefined,
      },
    };
  }
}

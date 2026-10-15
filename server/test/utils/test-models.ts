// A minimal Mongoose-like API over the PostgreSQL test database, so the API tests read and seed data
// with the same document shapes the API uses (built with the production mappers in src/db).
import { and, count, eq, SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import type { Database } from '../../src/db/database.module';
import * as schema from '../../src/db/schema';
import {
  categoryTranslationValues,
  categoryValues,
  configShippingValues,
  orderValues,
  toConfigDoc,
  toOrderDoc,
  toThemeDoc,
  toUserDoc,
} from '../../src/db/mappers';
import { findProduct, insertProduct, toCategoryDocs } from '../../src/db/catalog';

type Doc = Record<string, any>;
type Filter = Record<string, unknown>;

export interface TestModel {
  create<T extends Doc | Doc[]>(input: T): Promise<T extends Doc[] ? any[] : any>;
  /** Supports `{}` and equality on the listed filter fields */
  findOne(filter?: Filter): Promise<any> & { lean: () => Promise<any> };
  countDocuments(filter?: Filter): Promise<number>;
  deleteMany(filter?: Filter): Promise<void>;
}

interface ModelSpec {
  table: PgTable;
  /** API filter field → column */
  columns: Record<string, any>;
  insert: (input: Doc) => Promise<Doc>;
  /** Builds the API document for a row of `table` */
  toDoc: (row: any) => Promise<Doc>;
}

const date = (value: unknown) => (value === undefined ? {} : { createdAt: new Date(value as string) });

export function createModels(db: Database): Record<string, TestModel> {
  const specs: Record<string, ModelSpec> = {
    Product: {
      table: schema.products,
      columns: { titleUrl: schema.products.titleUrl },
      insert: (input) => insertProduct(db, input, date(input.dateAdded)),
      toDoc: async (row) => (await findProduct(db, { id: row.id }))!,
    },
    Category: {
      table: schema.categories,
      columns: { titleUrl: schema.categories.titleUrl },
      insert: async (input) => {
        const [row] = await db
          .insert(schema.categories)
          .values({ ...(categoryValues(input) as typeof schema.categories.$inferInsert), ...date(input.dateAdded) })
          .returning();
        const langValues = categoryTranslationValues(row.id, input);
        if (langValues.length) await db.insert(schema.categoryTranslations).values(langValues);
        return (await toCategoryDocs(db, [row]))[0];
      },
      toDoc: async (row) => (await toCategoryDocs(db, [row]))[0],
    },
    Order: {
      table: schema.orders,
      columns: { orderId: schema.orders.orderNumber },
      insert: async (input) => {
        // Defaults for the NOT NULL columns MongoDB did not require
        const values = { customerEmail: '', currency: 'EUR', amount: 0, cart: {} as any, ...orderValues(input) };
        const [row] = await db
          .insert(schema.orders)
          .values(values as typeof schema.orders.$inferInsert)
          .returning();
        return toOrderDoc(row);
      },
      toDoc: async (row) => toOrderDoc(row),
    },
    User: {
      table: schema.users,
      columns: { email: schema.users.email },
      insert: async (input) => {
        const [row] = await db
          .insert(schema.users)
          .values({ email: input.email, name: input.name, passwordHash: input.password, roles: input.roles ?? [] })
          .returning();
        return userDoc(row);
      },
      toDoc: async (row) => userDoc(row),
    },
    Theme: {
      table: schema.themes,
      columns: { titleUrl: schema.themes.titleUrl },
      insert: async (input) => {
        const [row] = await db
          .insert(schema.themes)
          .values({ titleUrl: input.titleUrl, active: !!input.active, styles: input.styles ?? {} })
          .returning();
        return toThemeDoc(row);
      },
      toDoc: async (row) => toThemeDoc(row),
    },
    Config: {
      table: schema.configs,
      columns: { titleUrl: schema.configs.titleUrl },
      insert: async (input) => {
        const [row] = await db.insert(schema.configs).values({ titleUrl: input.titleUrl, active: !!input.active }).returning();
        const shipping = configShippingValues(row.id, input);
        if (shipping.length) await db.insert(schema.configShipping).values(shipping);
        return toConfigDoc(row, await db.select().from(schema.configShipping).where(eq(schema.configShipping.configId, row.id)));
      },
      toDoc: async (row) => toConfigDoc(row, await db.select().from(schema.configShipping).where(eq(schema.configShipping.configId, row.id))),
    },
  };

  const where = (spec: ModelSpec, filter: Filter = {}): SQL | undefined => {
    const conditions = Object.entries(filter).map(([field, value]) => {
      const column = spec.columns[field];
      if (!column) throw new Error(`Test model filter on ${field} is not supported`);
      return eq(column, value);
    });
    return conditions.length ? and(...conditions) : undefined;
  };

  return Object.fromEntries(
    Object.entries(specs).map(([name, spec]) => {
      const model: TestModel = {
        create: (async (input: Doc | Doc[]) => {
          if (!Array.isArray(input)) return spec.insert(input);
          const docs: Doc[] = [];
          for (const item of input) docs.push(await spec.insert(item));
          return docs;
        }) as TestModel['create'],
        findOne: (filter) => {
          const result = (async () => {
            const [row] = await db.select().from(spec.table).where(where(spec, filter)).limit(1);
            return row ? spec.toDoc(row) : null;
          })();
          return Object.assign(result, { lean: () => result });
        },
        countDocuments: async (filter) => {
          const [{ value }] = await db.select({ value: count() }).from(spec.table).where(where(spec, filter));
          return value;
        },
        deleteMany: async (filter) => {
          await db.delete(spec.table).where(where(spec, filter));
        },
      };
      return [name, model];
    }),
  );
}

/** The user document plus `password`, the field name the API tests know from MongoDB */
const userDoc = (row: typeof schema.users.$inferSelect) => {
  const doc = toUserDoc(row);
  return { ...doc, password: doc.passwordHash };
};

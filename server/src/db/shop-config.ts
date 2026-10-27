import { eq } from 'drizzle-orm';
import type { ShopConfig } from '@eshop/shared';

import { Database } from './database.module';
import { configShipping, configs } from './schema';
import { toConfigDoc } from './mappers';

/**
 * The active shop config (shipping costs per language), or null for the built-in defaults.
 * Read whenever a cart is priced, so an admin change applies to every visitor at once.
 */
export async function activeShopConfig(db: Database): Promise<ShopConfig | null> {
  const [row] = await db.select().from(configs).where(eq(configs.active, true)).limit(1);
  if (!row) return null;
  const shipping = await db.select().from(configShipping).where(eq(configShipping.configId, row.id));
  return toConfigDoc(row, shipping) as unknown as ShopConfig;
}

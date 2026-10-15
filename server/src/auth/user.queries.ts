import { eq, sql } from 'drizzle-orm';

import type { Database } from '../db/database.module';
import { toUserDoc, UserDoc } from '../db/mappers';
import { users } from '../db/schema';

/** Case-insensitive lookup (decision D5: one account per email regardless of case) */
export async function findUserByEmail(db: Database, email: string): Promise<UserDoc | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()));
  return row ? toUserDoc(row) : null;
}

/** PostgreSQL error code of a failed query (Drizzle wraps the driver error as `cause`) */
export const pgErrorCode = (error: unknown): string | undefined =>
  (error as { cause?: { code?: string } })?.cause?.code ?? (error as { code?: string })?.code;

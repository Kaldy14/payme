import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import { env } from "@/lib/env";

const globalForPg = globalThis as typeof globalThis & {
  __paymePool?: Pool;
};

export const pool =
  globalForPg.__paymePool ??
  new Pool({
    connectionString: env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__paymePool = pool;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function firstRow<T extends QueryResultRow>(result: QueryResult<T>): T | null {
  return result.rows[0] ?? null;
}

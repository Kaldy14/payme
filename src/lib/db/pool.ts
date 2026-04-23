import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import { env } from "@/lib/env";

const globalForPg = globalThis as typeof globalThis & {
  __paymePool?: Pool;
};

function getPoolOptions() {
  const url = new URL(env.DATABASE_URL);
  const isLocalHost = ["127.0.0.1", "localhost"].includes(url.hostname);
  const connectionUrl = new URL(env.DATABASE_URL);

  if (!isLocalHost) {
    connectionUrl.searchParams.set("sslmode", "no-verify");
  }

  return {
    connectionString: connectionUrl.toString(),
    ssl: isLocalHost ? undefined : { rejectUnauthorized: false },
  };
}

export const pool =
  globalForPg.__paymePool ??
  new Pool(getPoolOptions());

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

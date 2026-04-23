import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "db", "migrations");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run domain migrations.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureMigrationTable(client) {
  await client.query(`
    create table if not exists app_schema_migration (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await ensureMigrationTable(client);

    const applied = new Set(
      (
        await client.query("select name from app_schema_migration order by name asc")
      ).rows.map((row) => row.name),
    );

    const entries = (await fs.readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const name of entries) {
      if (applied.has(name)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, name), "utf8");
      await client.query(sql);
      await client.query("insert into app_schema_migration (name) values ($1)", [
        name,
      ]);
      console.log(`applied ${name}`);
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

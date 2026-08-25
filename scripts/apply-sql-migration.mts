/**
 * Apply a single Supabase migration SQL file to the linked database.
 *
 * Requires SUPABASE_DB_URL (direct Postgres connection string).
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   node --env-file=.env.local --experimental-strip-types scripts/apply-sql-migration.mts supabase/migrations/20260825130000_create_breeder_application_submit_rpcs.sql
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main(): Promise<void> {
  const fileArg = process.argv[2];
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();

  if (!fileArg) {
    console.error("Usage: apply-sql-migration.mts <path-to-sql-file>");
    process.exitCode = 1;
    return;
  }

  if (!dbUrl) {
    console.error("Missing SUPABASE_DB_URL — apply migration via Supabase SQL Editor instead.");
    process.exitCode = 1;
    return;
  }

  const sqlPath = resolve(process.cwd(), fileArg);
  const sql = readFileSync(sqlPath, "utf8");

  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: dbUrl });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`Applied migration: ${fileArg}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

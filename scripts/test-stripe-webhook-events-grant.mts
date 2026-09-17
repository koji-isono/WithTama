/**
 * Static verification for stripe_webhook_events service_role GRANT migration.
 * No DB required.
 *
 * Usage: npx tsx scripts/test-stripe-webhook-events-grant.mts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const GRANT_MIGRATION = join(
  ROOT,
  "supabase/migrations/20260917100000_grant_stripe_webhook_events_service_role.sql",
);

const STEP1_MIGRATION = join(
  ROOT,
  "supabase/migrations/20260826173000_stripe_step1_billing_columns_and_protection.sql",
);

const PHASE1_MIGRATION = join(
  ROOT,
  "supabase/migrations/20260914100000_grant_phase1_table_privileges.sql",
);

const REPOSITORY_SOURCE = join(ROOT, "src/features/billing/webhook/repository.ts");

type Check = { name: string; passed: boolean; detail?: string };

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function main(): void {
  const checks: Check[] = [];
  const grantSql = read(GRANT_MIGRATION);
  const step1Sql = read(STEP1_MIGRATION);
  const phase1Sql = read(PHASE1_MIGRATION);
  const repoSource = read(REPOSITORY_SOURCE);

  record(
    checks,
    "1. grant migration grants service_role DML",
    /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.stripe_webhook_events TO service_role/.test(
      grantSql,
    ),
  );

  record(checks, "2. no GRANT ALL ON TABLE", !/GRANT ALL ON TABLE/i.test(grantSql));

  record(
    checks,
    "3. no GRANT to anon or authenticated",
    !/TO anon/.test(grantSql) && !/TO authenticated/.test(grantSql),
  );

  record(
    checks,
    "4. no RLS or policy changes",
    !grantSql.includes("CREATE POLICY") &&
      !grantSql.includes("DROP POLICY") &&
      !grantSql.includes("ALTER TABLE") &&
      !grantSql.includes("ENABLE ROW LEVEL SECURITY"),
  );

  record(
    checks,
    "5. step1 migration creates stripe_webhook_events with RLS",
    step1Sql.includes("CREATE TABLE IF NOT EXISTS public.stripe_webhook_events") &&
      step1Sql.includes("ENABLE ROW LEVEL SECURITY"),
  );

  record(
    checks,
    "6. phase1 migration revokes anon/authenticated",
    /REVOKE ALL ON TABLE public\.stripe_webhook_events FROM anon, authenticated/.test(phase1Sql),
  );

  record(
    checks,
    "7. repository uses INSERT claim",
    repoSource.includes('.from("stripe_webhook_events").insert'),
  );

  record(
    checks,
    "8. repository uses SELECT for classify",
    repoSource.includes('.select("created_at, processed_at")'),
  );

  record(
    checks,
    "9. repository uses UPDATE finalize",
    repoSource.includes(".update({ processed_at:"),
  );

  record(
    checks,
    "10. repository uses DELETE release",
    repoSource.includes('.from("stripe_webhook_events")\n    .delete()'),
  );

  const failed = checks.filter((check) => !check.passed);
  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();

/**
 * Static verification for Phase 1 service_role table GRANT migrations.
 * No DB required.
 *
 * Usage: npx tsx scripts/test-phase1-service-role-grants.mts
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const BREEDERS_GRANT_MIGRATION = join(
  ROOT,
  "supabase/migrations/20260918100000_grant_phase1_service_role_table_privileges.sql",
);

const STRIPE_WEBHOOK_GRANT_MIGRATION = join(
  ROOT,
  "supabase/migrations/20260917100000_grant_stripe_webhook_events_service_role.sql",
);

const ADMIN_SOURCE = join(ROOT, "src/lib/supabase/admin.ts");
const WEBHOOK_REPOSITORY = join(ROOT, "src/features/billing/webhook/repository.ts");

type Check = { name: string; passed: boolean; detail?: string };

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function grepSrcForCreateAdminClient(): string[] {
  try {
    const output = execSync('git grep -l "createAdminClient" -- src/', {
      encoding: "utf8",
      cwd: ROOT,
    }).trim();
    if (!output) {
      return [];
    }
    return output.split("\n").map((path) => path.replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

function main(): void {
  const checks: Check[] = [];
  const breedersGrantSql = read(BREEDERS_GRANT_MIGRATION);
  const stripeGrantSql = read(STRIPE_WEBHOOK_GRANT_MIGRATION);
  const adminSource = read(ADMIN_SOURCE);
  const webhookRepo = read(WEBHOOK_REPOSITORY);
  const combinedGrantSql = `${breedersGrantSql}\n${stripeGrantSql}`;

  record(
    checks,
    "1. breeders migration grants service_role SELECT UPDATE",
    /GRANT SELECT, UPDATE ON TABLE public\.breeders TO service_role/.test(breedersGrantSql),
  );

  record(
    checks,
    "2. breeders migration does not grant INSERT or DELETE to service_role",
    !/GRANT[^;]*INSERT[^;]*breeders[^;]*service_role/is.test(breedersGrantSql) &&
      !/GRANT[^;]*DELETE[^;]*breeders[^;]*service_role/is.test(breedersGrantSql) &&
      !/GRANT SELECT, INSERT/.test(breedersGrantSql) &&
      !/GRANT SELECT, UPDATE, DELETE/.test(breedersGrantSql),
  );

  record(
    checks,
    "3. stripe_webhook_events migration grants service_role S I U D",
    /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.stripe_webhook_events TO service_role/.test(
      stripeGrantSql,
    ),
  );

  record(checks, "4. no GRANT ALL ON TABLE", !/GRANT ALL ON TABLE/i.test(combinedGrantSql));

  record(
    checks,
    "5. breeders migration has no GRANT to anon or authenticated",
    !/TO anon/.test(breedersGrantSql) && !/TO authenticated/.test(breedersGrantSql),
  );

  record(
    checks,
    "6. no RLS or policy changes in breeders migration",
    !breedersGrantSql.includes("CREATE POLICY") &&
      !breedersGrantSql.includes("DROP POLICY") &&
      !breedersGrantSql.includes("ALTER TABLE") &&
      !breedersGrantSql.includes("ENABLE ROW LEVEL SECURITY") &&
      !breedersGrantSql.includes("CREATE TRIGGER") &&
      !breedersGrantSql.includes("DROP TRIGGER"),
  );

  const createAdminClientFiles = grepSrcForCreateAdminClient();
  const expectedCreateAdminClientFiles = new Set([
    "src/lib/supabase/admin.ts",
    "src/features/billing/webhook/repository.ts",
  ]);
  record(
    checks,
    "7. createAdminClient defined in admin.ts and used only from webhook repository",
    adminSource.includes("createAdminClient") &&
      createAdminClientFiles.length === expectedCreateAdminClientFiles.size &&
      createAdminClientFiles.every((path) => expectedCreateAdminClientFiles.has(path)),
    createAdminClientFiles.join(", ") || "none",
  );

  record(
    checks,
    "8. webhook repository uses breeders SELECT lookup",
    webhookRepo.includes('.from("breeders")') &&
      webhookRepo.includes(".select(breederWebhookSelect)"),
  );

  record(
    checks,
    "9. webhook repository uses breeders UPDATE only (no insert/delete)",
    webhookRepo.includes('.from("breeders").update(fields)') &&
      !webhookRepo.includes('.from("breeders").insert') &&
      !webhookRepo.includes('.from("breeders")\n    .delete()'),
  );

  record(
    checks,
    "10. webhook repository uses stripe_webhook_events S I U D",
    webhookRepo.includes('.from("stripe_webhook_events").insert') &&
      webhookRepo.includes('.select("created_at, processed_at")') &&
      webhookRepo.includes(".update({ processed_at:") &&
      webhookRepo.includes('.from("stripe_webhook_events")\n    .delete()'),
  );

  const failed = checks.filter((check) => !check.passed);
  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();

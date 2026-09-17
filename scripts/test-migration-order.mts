/**
 * Migration filename order checks (no DB).
 * Guards against buyers being applied after favorites/inquiries on empty db push.
 *
 * Usage: npx tsx scripts/test-migration-order.mts
 */

import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");

const EXPECTED_COUNT = 35;
const BUYERS = "20260804160000_create_buyers.sql";
const FAVORITES = "20260804161228_create_favorites.sql";
const INQUIRIES = "20260804163239_create_inquiries_messages_visits.sql";
const OLD_BUYERS = "20260804164648_create_buyers.sql";

type Check = { name: string; passed: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
}

function migrationVersion(filename: string): string {
  if (filename.startsWith("001_")) {
    return "001";
  }
  const match = /^(\d{14})_/.exec(filename);
  if (!match) {
    throw new Error(`Invalid migration filename: ${filename}`);
  }
  return match[1];
}

function listMigrationFiles(): string[] {
  try {
    const tracked = execSync('git ls-files "supabase/migrations/*.sql"', {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
    if (tracked) {
      return tracked
        .split("\n")
        .map((path) => path.replace(/^supabase\/migrations\//, ""))
        .sort((a, b) => migrationVersion(a).localeCompare(migrationVersion(b)));
    }
  } catch {
    // fall through to filesystem listing (e.g. outside git)
  }

  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => migrationVersion(a).localeCompare(migrationVersion(b)));
}

const files = listMigrationFiles();

const GRANTS = "20260914100000_grant_phase1_table_privileges.sql";
const STRIPE_WEBHOOK_EVENTS_GRANT = "20260917100000_grant_stripe_webhook_events_service_role.sql";

record("migration count is 35", files.length === EXPECTED_COUNT, `got ${files.length}`);

record("create_buyers uses corrected version", files.includes(BUYERS));
record("old create_buyers version removed", !files.includes(OLD_BUYERS));

const buyersIdx = files.indexOf(BUYERS);
const favoritesIdx = files.indexOf(FAVORITES);
const inquiriesIdx = files.indexOf(INQUIRIES);

record("create_buyers file exists", buyersIdx >= 0);
record("create_favorites file exists", favoritesIdx >= 0);
record("create_inquiries file exists", inquiriesIdx >= 0);

if (buyersIdx >= 0 && favoritesIdx >= 0) {
  record("create_buyers before create_favorites", buyersIdx < favoritesIdx);
}

if (buyersIdx >= 0 && inquiriesIdx >= 0) {
  record("create_buyers before create_inquiries", buyersIdx < inquiriesIdx);
}

if (favoritesIdx >= 0 && inquiriesIdx >= 0) {
  record("create_favorites before create_inquiries", favoritesIdx < inquiriesIdx);
}

const expectedHead = [
  "001_pets.sql",
  "20260804132200_update_pets_v1_1.sql",
  "20260804135800_create_breeders.sql",
  "20260804144700_update_breeders_draft_nullable.sql",
  BUYERS,
  FAVORITES,
  INQUIRIES,
];

const headMatches = expectedHead.every((name, i) => files[i] === name);
record("first 7 migrations in expected order", headMatches);

record("grant_phase1_table_privileges migration exists", files.includes(GRANTS));
record(
  "grant_stripe_webhook_events_service_role migration exists",
  files.includes(STRIPE_WEBHOOK_EVENTS_GRANT),
);
record(
  "grant_stripe_webhook_events_service_role migration is last",
  files.length > 0 && files[files.length - 1] === STRIPE_WEBHOOK_EVENTS_GRANT,
  files.length > 0 ? `last=${files[files.length - 1]}` : undefined,
);

const failed = checks.filter((c) => !c.passed);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);

if (failed.length > 0) {
  process.exitCode = 1;
}

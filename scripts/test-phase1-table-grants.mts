/**
 * Phase1 table GRANT migration verification.
 *
 * Static: migration SQL shape (privileges, no DEFAULT PRIVILEGES, stripe revoke).
 * Live (optional): requires migration applied + .env.local Supabase + SEC_TEST_* users.
 *
 * Usage:
 *   npm run test:phase1-table-grants
 *   npm run test:phase1-table-grants -- --env-file=.env.local  (via node --env-file in package.json)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const ROOT = process.cwd();
const MIGRATION_PATH = join(
  ROOT,
  "supabase/migrations/20260914100000_grant_phase1_table_privileges.sql",
);

type Check = { name: string; passed: boolean; detail?: string; skipped?: boolean };

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function skip(checks: Check[], name: string, detail: string): void {
  checks.push({ name, passed: true, detail, skipped: true });
  console.log(`SKIP ${name} (${detail})`);
}

function finish(checks: Check[]): void {
  const executed = checks.filter((c) => !c.skipped);
  const passed = executed.filter((c) => c.passed).length;
  const failed = executed.length - passed;
  const skipped = checks.filter((c) => c.skipped).length;
  console.log("");
  console.log(`${passed} passed / ${failed} failed / ${skipped} skipped`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function isPermissionDenied(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("permission denied") ||
    message.includes("42501") ||
    lower.includes("row-level security")
  );
}

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, "utf8");
}

function runStaticChecks(checks: Check[]): void {
  const sql = readMigration();

  record(checks, "S1. migration file exists", sql.length > 0);

  record(
    checks,
    "S2. GRANT USAGE ON SCHEMA public",
    /GRANT USAGE ON SCHEMA public TO anon, authenticated/.test(sql),
  );

  record(
    checks,
    "S3. buyers authenticated SELECT INSERT UPDATE",
    /GRANT SELECT, INSERT, UPDATE ON TABLE public\.buyers TO authenticated/.test(sql),
  );

  record(
    checks,
    "S4. breeders authenticated SELECT INSERT UPDATE",
    /GRANT SELECT, INSERT, UPDATE ON TABLE public\.breeders TO authenticated/.test(sql),
  );

  record(
    checks,
    "S5. favorites authenticated SELECT INSERT DELETE",
    /GRANT SELECT, INSERT, DELETE ON TABLE public\.favorites TO authenticated/.test(sql),
  );

  record(
    checks,
    "S6. visits authenticated SELECT only",
    /GRANT SELECT ON TABLE public\.visits TO authenticated/.test(sql) &&
      !/GRANT SELECT, INSERT, UPDATE ON TABLE public\.visits/.test(sql),
  );

  record(
    checks,
    "S7. anon pet_photos SELECT only",
    /GRANT SELECT ON TABLE public\.pet_photos TO anon/.test(sql),
  );

  record(
    checks,
    "S8. stripe_webhook_events REVOKE anon authenticated",
    /REVOKE ALL ON TABLE public\.stripe_webhook_events FROM anon, authenticated/.test(sql),
  );

  record(checks, "S9. no ALTER DEFAULT PRIVILEGES", !/ALTER DEFAULT PRIVILEGES/i.test(sql));

  const grantLines = sql.split("\n").filter((line) => /^\s*GRANT/i.test(line));
  const badPrivilegeGrant = grantLines.some((line) =>
    /\b(TRIGGER|TRUNCATE|REFERENCES)\b/i.test(line),
  );
  record(checks, "S10. no TRIGGER TRUNCATE REFERENCES grants", !badPrivilegeGrant);

  record(
    checks,
    "S11. no GRANT ALL ON TABLE",
    !/GRANT ALL ON TABLE/i.test(sql),
  );

  record(checks, "S12. no GRANT DELETE on buyers", !/GRANT[^;]*DELETE[^;]*buyers/i.test(sql));

  record(checks, "S13. no GRANT DELETE on breeders", !/GRANT[^;]*DELETE[^;]*breeders/i.test(sql));

  record(
    checks,
    "S14. review logs authenticated SELECT only",
    /GRANT SELECT ON TABLE public\.pet_review_logs TO authenticated/.test(sql) &&
      !/GRANT SELECT, INSERT ON TABLE public\.pet_review_logs/.test(sql) &&
      /GRANT SELECT ON TABLE public\.breeder_review_logs TO authenticated/.test(sql),
  );

  record(checks, "S15. no anon GRANT on pets base table", !/GRANT SELECT ON TABLE public\.pets TO anon/.test(sql));
}

async function signIn(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`signIn failed: ${error.message}`);
  }

  return client;
}

async function runLiveChecks(checks: Check[]): void {
  const supabaseUrl = optionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = optionalEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!supabaseUrl || !anonKey) {
    skip(checks, "L1–L10 live DB checks", "NEXT_PUBLIC_SUPABASE_* unset");
    return;
  }

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: anonBuyers, error: anonBuyersError } = await anonClient
    .from("buyers")
    .select("id")
    .limit(1);

  const anonBuyersBlocked =
    (anonBuyersError != null && isPermissionDenied(anonBuyersError.message)) ||
    (anonBuyersError == null && (anonBuyers ?? []).length === 0);

  record(
    checks,
    "L1. anon cannot read buyers rows (grant denied or RLS empty)",
    anonBuyersBlocked,
    anonBuyersError?.message ?? `rows=${(anonBuyers ?? []).length}`,
  );

  const { data: publicPets, error: publicPetsError } = await anonClient
    .from("published_pets_public")
    .select("id")
    .limit(1);

  record(
    checks,
    "L2. anon can SELECT published_pets_public view",
    publicPetsError == null,
    publicPetsError?.message,
  );

  const publishedPetId = optionalEnv("SEC_TEST_PUBLIC_PUBLISHED_PET_ID");

  if (publishedPetId) {
    const { error: anonPhotosError } = await anonClient
      .from("pet_photos")
      .select("id")
      .eq("pet_id", publishedPetId)
      .limit(1);

    record(
      checks,
      "L3. anon can SELECT pet_photos for public pet",
      anonPhotosError == null,
      anonPhotosError?.message,
    );
  } else if ((publicPets ?? []).length > 0) {
    const petId = publicPets![0]!.id as string;
    const { error: anonPhotosError } = await anonClient
      .from("pet_photos")
      .select("id")
      .eq("pet_id", petId)
      .limit(1);

    record(
      checks,
      "L3. anon can SELECT pet_photos for public pet",
      anonPhotosError == null,
      anonPhotosError?.message,
    );
  } else {
    skip(checks, "L3. anon can SELECT pet_photos for public pet", "no published pet id");
  }

  const buyerEmail = optionalEnv("SEC_TEST_BUYER_EMAIL");
  const buyerPassword = optionalEnv("SEC_TEST_BUYER_PASSWORD");

  if (!buyerEmail || !buyerPassword) {
    skip(checks, "L4–L6 buyer authenticated checks", "SEC_TEST_BUYER_* unset");
  } else {
    const buyerClient = await signIn(supabaseUrl, anonKey, buyerEmail, buyerPassword);
    const {
      data: { user: buyerUser },
    } = await buyerClient.auth.getUser();

    const { data: buyerRow, error: buyerSelectError } = await buyerClient
      .from("buyers")
      .select("id, user_id")
      .maybeSingle();

    record(
      checks,
      "L4. buyer authenticated SELECT own buyers row",
      buyerSelectError == null && buyerRow != null,
      buyerSelectError?.message,
    );

    if (buyerUser) {
      const probeDisplayName = `grant-probe-${Date.now()}`;
      const { error: bootstrapInsertError } = await buyerClient.from("buyers").insert({
        user_id: buyerUser.id,
        display_name: probeDisplayName,
      });

      if (bootstrapInsertError && bootstrapInsertError.message.includes("duplicate key")) {
        record(checks, "L5. buyer bootstrap INSERT grant (unique → row exists)", true);
      } else {
        record(
          checks,
          "L5. buyer bootstrap INSERT grant",
          bootstrapInsertError == null,
          bootstrapInsertError?.message,
        );
      }
    } else {
      record(checks, "L5. buyer bootstrap INSERT grant", false, "no user after signIn");
    }

    const { data: foreignBuyers, error: foreignError } = await buyerClient
      .from("buyers")
      .select("id")
      .filter("user_id", "neq", buyerUser?.id ?? "")
      .limit(1);

    record(
      checks,
      "L6. buyer cannot read other buyers rows (RLS)",
      foreignError == null && (foreignBuyers ?? []).length === 0,
      foreignError?.message ?? `rows=${(foreignBuyers ?? []).length}`,
    );
  }

  const breederEmail = optionalEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = optionalEnv("SEC_TEST_BREEDER_PASSWORD");

  if (!breederEmail || !breederPassword) {
    skip(checks, "L7 breeder authenticated SELECT", "SEC_TEST_BREEDER_* unset");
  } else {
    const breederClient = await signIn(supabaseUrl, anonKey, breederEmail, breederPassword);
    const { data: breederRow, error: breederSelectError } = await breederClient
      .from("breeders")
      .select("id")
      .maybeSingle();

    record(
      checks,
      "L7. breeder authenticated SELECT own breeders row",
      breederSelectError == null && breederRow != null,
      breederSelectError?.message,
    );
  }

  if (buyerEmail && buyerPassword) {
    const buyerClient = await signIn(supabaseUrl, anonKey, buyerEmail, buyerPassword);
    const { data: stripeRows, error: stripeError } = await buyerClient
      .from("stripe_webhook_events")
      .select("id")
      .limit(1);

    const stripeBlocked =
      stripeError != null && isPermissionDenied(stripeError.message);

    record(
      checks,
      "L8. authenticated cannot SELECT stripe_webhook_events",
      stripeBlocked,
      stripeError?.message ??
        (stripeRows != null
          ? `query succeeded (rows=${stripeRows.length}) — apply grant migration REVOKE`
          : undefined),
    );
  } else {
    skip(checks, "L8. authenticated cannot SELECT stripe_webhook_events", "SEC_TEST_BUYER unset");
  }

  const { data: anonStripeRows, error: anonStripeError } = await anonClient
    .from("stripe_webhook_events")
    .select("id")
    .limit(1);

  const anonStripeBlocked =
    anonStripeError != null && isPermissionDenied(anonStripeError.message);

  record(
    checks,
    "L9. anon cannot SELECT stripe_webhook_events",
    anonStripeBlocked,
    anonStripeError?.message ??
      (anonStripeRows != null
        ? `query succeeded (rows=${anonStripeRows.length}) — apply grant migration REVOKE`
        : undefined),
  );

  record(
    checks,
    "L10. public pets view returned rows or empty without error",
    publicPetsError == null,
    `count=${(publicPets ?? []).length}`,
  );
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  console.log("Phase1 table GRANT checks\n");

  runStaticChecks(checks);

  console.log("");
  console.log("Live DB checks\n");

  try {
    await runLiveChecks(checks);
  } catch (error) {
    record(
      checks,
      "L0. live checks setup",
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  finish(checks);
}

main();

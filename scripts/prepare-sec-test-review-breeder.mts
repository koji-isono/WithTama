/**

 * SEC-TEST breeder preparation for phase 5 pet review RPC security test.

 *

 * NOT a production admin breeder review feature.

 * Dev/test only — do not call from application code.

 *

 * Phase A: breeder JWT — ownership verification only (no breeder UPDATE).

 * Phase B: admin JWT — review_status / verification status UPDATE only.

 *

 * Requires:

 *   NEXT_PUBLIC_SUPABASE_URL

 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

 *   SEC_TEST_BREEDER_EMAIL

 *   SEC_TEST_BREEDER_PASSWORD

 *   SEC_TEST_ADMIN_EMAIL

 *   SEC_TEST_ADMIN_PASSWORD

 *   SEC_TEST_REVIEW_BREEDER_ID

 *

 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.

 *

 * Usage:

 *   npm run prepare:sec-test-review-breeder

 *   npx tsx scripts/prepare-sec-test-review-breeder.mts

 */

import nextEnv from "@next/env";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type Check = {
  name: string;

  passed: boolean;

  detail?: string;
};

type BreederReviewState = {
  id: string;

  user_id: string;

  review_status: string;

  identity_verification_status: string;

  business_verification_status: string;

  registration_expires_at: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });

  const suffix = detail ? ` (${detail})` : "";

  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function isAdminRole(user: User): boolean {
  return user.app_metadata?.role === "admin";
}

function isRegistrationValid(expiresAt: string | null): boolean {
  if (expiresAt == null) {
    return false;
  }

  const expires = new Date(expiresAt);

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  expires.setHours(0, 0, 0, 0);

  return expires >= today;
}

function createAnonClient(supabaseUrl: string, publishableKey: string): SupabaseClient {
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,

      autoRefreshToken: false,
    },
  });
}

function isExpectedPreUpdateState(breeder: BreederReviewState): boolean {
  return (
    breeder.review_status === "submitted" &&
    breeder.identity_verification_status === "submitted" &&
    breeder.business_verification_status === "submitted" &&
    isRegistrationValid(breeder.registration_expires_at)
  );
}

function isExpectedPostUpdateState(
  breeder: BreederReviewState,

  registrationExpiresAtBefore: string | null,
): boolean {
  return (
    breeder.review_status === "approved" &&
    breeder.identity_verification_status === "verified" &&
    breeder.business_verification_status === "verified" &&
    breeder.registration_expires_at === registrationExpiresAtBefore &&
    isRegistrationValid(breeder.registration_expires_at)
  );
}

async function authenticateBreeder(
  supabase: SupabaseClient,

  email: string,

  password: string,

  checks: Check[],
): Promise<User | null> {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,

    password,
  });

  record(checks, "breeder authentication", signInError == null, signInError?.message);

  if (signInError) {
    return null;
  }

  const {
    data: { user },

    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    record(checks, "breeder non-admin account", false, userError?.message);

    return null;
  }

  if (isAdminRole(user)) {
    record(
      checks,

      "breeder non-admin account",

      false,

      "app_metadata.role is admin — use non-admin SEC_TEST_BREEDER account",
    );

    return null;
  }

  record(checks, "breeder non-admin account", true);

  return user;
}

async function verifyBreederOwnership(
  supabase: SupabaseClient,

  breederId: string,

  userId: string,

  checks: Check[],
): Promise<boolean> {
  const { data, error } = await supabase

    .from("breeders")

    .select("id, user_id")

    .eq("id", breederId)

    .maybeSingle();

  if (error || !data) {
    record(
      checks,

      "breeder ownership",

      false,

      error?.message ?? "breeder not found or not visible to logged-in breeder",
    );

    return false;
  }

  const ok = data.user_id === userId;

  record(
    checks,

    "breeder ownership",

    ok,

    ok ? undefined : "SEC_TEST_REVIEW_BREEDER_ID does not belong to SEC_TEST_BREEDER_EMAIL user",
  );

  return ok;
}

async function authenticateAdmin(
  supabase: SupabaseClient,

  email: string,

  password: string,

  checks: Check[],
): Promise<User | null> {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,

    password,
  });

  record(checks, "admin authentication", signInError == null, signInError?.message);

  if (signInError) {
    return null;
  }

  const {
    data: { user },

    error: userError,
  } = await supabase.auth.getUser();

  const adminOk = userError == null && user != null && isAdminRole(user);

  record(
    checks,

    "admin role",

    adminOk,

    userError?.message ??
      (user && !isAdminRole(user) ? "app_metadata.role is not admin" : undefined),
  );

  return adminOk ? user : null;
}

async function fetchBreederState(
  supabase: SupabaseClient,

  breederId: string,
): Promise<{ breeder: BreederReviewState | null; errorMessage?: string }> {
  const { data, error } = await supabase

    .from("breeders")

    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, registration_expires_at",
    )

    .eq("id", breederId)

    .maybeSingle();

  if (error || !data) {
    return { breeder: null, errorMessage: error?.message ?? "breeder not found or not visible" };
  }

  return { breeder: data as BreederReviewState };
}

async function loadBreeder(
  supabase: SupabaseClient,

  breederId: string,

  checks: Check[],
): Promise<BreederReviewState | null> {
  const { breeder, errorMessage } = await fetchBreederState(supabase, breederId);

  const ok = breeder != null;

  record(checks, "breeder lookup", ok, errorMessage);

  return breeder;
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;

  let publishableKey: string;

  let breederEmail: string;

  let breederPassword: string;

  let adminEmail: string;

  let adminPassword: string;

  let breederId: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");

    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

    breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");

    breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");

    adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");

    adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");

    breederId = requireEnv("SEC_TEST_REVIEW_BREEDER_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";

    console.log(`FAIL environment (${message})`);

    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  const breederClient = createAnonClient(supabaseUrl, publishableKey);

  const breederUser = await authenticateBreeder(
    breederClient,

    breederEmail,

    breederPassword,

    checks,
  );

  if (!breederUser) {
    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  const ownershipOk = await verifyBreederOwnership(
    breederClient,

    breederId,

    breederUser.id,

    checks,
  );

  if (!ownershipOk) {
    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  const adminClient = createAnonClient(supabaseUrl, publishableKey);

  const adminUser = await authenticateAdmin(adminClient, adminEmail, adminPassword, checks);

  if (!adminUser) {
    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  const breederBefore = await loadBreeder(adminClient, breederId, checks);

  if (!breederBefore) {
    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  const preStateOk = isExpectedPreUpdateState(breederBefore);

  record(
    checks,

    "current review state",

    preStateOk,

    preStateOk
      ? undefined
      : "expected submitted/submitted/submitted with valid registration_expires_at",
  );

  if (!preStateOk) {
    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  const registrationExpiresAtBefore = breederBefore.registration_expires_at;

  const { data: updateRows, error: updateError } = await adminClient

    .from("breeders")

    .update({
      review_status: "approved",

      identity_verification_status: "verified",

      business_verification_status: "verified",
    })

    .eq("id", breederId)

    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, registration_expires_at",
    );

  if (updateError == null && (updateRows?.length ?? 0) === 0) {
    record(
      checks,

      "breeder review update",

      false,

      "admin breeder UPDATE blocked (0 rows) — no admin UPDATE path under current RLS",
    );

    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  const updateOk = updateError == null && (updateRows?.length ?? 0) === 1;

  record(
    checks,

    "breeder review update",

    updateOk,

    updateError?.message ?? (updateOk ? undefined : "expected 1 updated row"),
  );

  if (!updateOk) {
    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  const { breeder: breederAfter, errorMessage: afterError } = await fetchBreederState(
    adminClient,

    breederId,
  );

  const finalOk =
    breederAfter != null &&
    afterError == null &&
    isExpectedPostUpdateState(breederAfter, registrationExpiresAtBefore);

  record(
    checks,

    "final review state",

    finalOk,

    finalOk
      ? undefined
      : (afterError ??
          "expected approved/verified/verified with unchanged valid registration_expires_at"),
  );

  if (!finalOk) {
    console.log("");

    console.log("Preparation aborted");

    process.exitCode = 1;

    return;
  }

  console.log("");

  console.log("Preparation completed");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";

  console.log(`FAIL unhandled error (${message})`);

  console.log("");

  console.log("Preparation aborted");

  process.exitCode = 1;
});

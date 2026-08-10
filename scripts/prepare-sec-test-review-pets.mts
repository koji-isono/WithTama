/**
 * SEC-TEST pet preparation for phase 5 pet review RPC security test.
 *
 * Creates or reuses two pets owned by SEC_TEST_REVIEW_BREEDER_ID:
 *   A: [SEC-TEST] Review RPC Approve Pet
 *   B: [SEC-TEST] Review RPC Return Pet
 *
 * Both end in status = under_review, published_at IS NULL.
 * Does NOT modify [SEC-TEST] Trigger Test Pet (phases 1–4).
 *
 * NOT production code. Dev/test only.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_REVIEW_BREEDER_ID
 *
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   npm run prepare:sec-test-review-pets
 *   npx tsx scripts/prepare-sec-test-review-pets.mts
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const APPROVE_PET_NAME = "[SEC-TEST] Review RPC Approve Pet";
const RETURN_PET_NAME = "[SEC-TEST] Review RPC Return Pet";
const PROTECTED_PET_NAME = "[SEC-TEST] Trigger Test Pet";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type BreederRow = {
  id: string;
  user_id: string;
  review_status: string;
  identity_verification_status: string;
  business_verification_status: string;
  registration_expires_at: string | null;
};

type PetRow = {
  id: string;
  management_name: string;
  status: string;
  published_at: string | null;
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

function isBreederEligibleForPhase5(breeder: BreederRow): boolean {
  return (
    breeder.review_status === "approved" &&
    breeder.identity_verification_status === "verified" &&
    breeder.business_verification_status === "verified" &&
    isRegistrationValid(breeder.registration_expires_at)
  );
}

function buildDraftInsertPayload(
  breederId: string,
  managementName: string,
  userId: string,
): Record<string, unknown> {
  return {
    breeder_id: breederId,
    management_name: managementName,
    public_display_name: managementName.replace(/^\[SEC-TEST\]\s*/, ""),
    species: "dog",
    breed: "SEC-TEST Mixed",
    sex: "male",
    birthday: "2024-01-01",
    color: "test",
    temperament: "calm",
    price: 100000,
    price_comment: null,
    status: "draft",
    display_order: 0,
    published_at: null,
    created_by: userId,
    updated_by: userId,
  };
}

async function findPetByName(
  supabase: SupabaseClient,
  breederId: string,
  managementName: string,
): Promise<{ pet: PetRow | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status, published_at")
    .eq("breeder_id", breederId)
    .eq("management_name", managementName)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { pet: null, errorMessage: error.message };
  }

  return { pet: data as PetRow | null };
}

async function submitDraftForReview(
  supabase: SupabaseClient,
  breederId: string,
  petId: string,
  userId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("pets")
    .update({
      status: "under_review",
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", petId)
    .eq("breeder_id", breederId)
    .eq("status", "draft")
    .select("id, status, published_at");

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  if ((data?.length ?? 0) !== 1) {
    return {
      ok: false,
      errorMessage:
        "draft -> under_review blocked (0 rows) — check Trigger / admin+breeder account",
    };
  }

  return { ok: true };
}

async function ensureUnderReviewPet(
  supabase: SupabaseClient,
  breederId: string,
  userId: string,
  managementName: string,
  checks: Check[],
  label: string,
): Promise<string | null> {
  if (managementName === PROTECTED_PET_NAME) {
    record(checks, label, false, "protected pet name must not be used");
    return null;
  }

  const { pet: existing, errorMessage: findError } = await findPetByName(
    supabase,
    breederId,
    managementName,
  );

  if (findError) {
    record(checks, label, false, findError);
    return null;
  }

  let petId: string;

  if (existing) {
    petId = existing.id;

    if (existing.status === "under_review" && existing.published_at == null) {
      record(checks, label, true, "reused existing under_review pet");
      return petId;
    }

    if (existing.status === "draft") {
      const submit = await submitDraftForReview(supabase, breederId, petId, userId);
      record(checks, label, submit.ok, submit.errorMessage ?? "reused draft pet -> under_review");
      return submit.ok ? petId : null;
    }

    record(
      checks,
      label,
      false,
      `existing pet status=${existing.status} cannot be prepared without rewriting — create fresh test data or reset manually`,
    );
    return null;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("pets")
    .insert(buildDraftInsertPayload(breederId, managementName, userId))
    .select("id, status, published_at");

  if (insertError || !inserted?.[0]) {
    record(checks, label, false, insertError?.message ?? "insert failed");
    return null;
  }

  petId = inserted[0].id as string;

  const submit = await submitDraftForReview(supabase, breederId, petId, userId);
  record(checks, label, submit.ok, submit.errorMessage ?? "inserted draft -> under_review");
  return submit.ok ? petId : null;
}

async function verifyFinalPetState(
  supabase: SupabaseClient,
  breederId: string,
  petId: string,
  managementName: string,
  checks: Check[],
  label: string,
): Promise<boolean> {
  const { pet, errorMessage } = await findPetByName(supabase, breederId, managementName);

  const ok =
    pet != null &&
    pet.id === petId &&
    pet.status === "under_review" &&
    pet.published_at == null &&
    errorMessage == null;

  record(
    checks,
    label,
    ok,
    errorMessage ??
      (ok
        ? undefined
        : `expected under_review with null published_at, got status=${pet?.status ?? "missing"}`),
  );

  return ok;
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;
  let publishableKey: string;
  let breederEmail: string;
  let breederPassword: string;
  let breederId: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
    breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
    breederId = requireEnv("SEC_TEST_REVIEW_BREEDER_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    console.log(`FAIL environment (${message})`);
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: breederEmail,
    password: breederPassword,
  });
  record(checks, "authentication", signInError == null, signInError?.message);

  if (signInError) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const authOk = userError == null && user != null;
  if (!authOk || !user) {
    record(checks, "breeder user lookup", false, userError?.message);
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  if (isAdminRole(user)) {
    record(
      checks,
      "breeder non-admin account",
      false,
      "admin+breeder cannot draft -> under_review via Trigger — use non-admin SEC_TEST_BREEDER",
    );
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }
  record(checks, "breeder non-admin account", true);

  const { data: breeder, error: breederError } = await supabase
    .from("breeders")
    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, registration_expires_at",
    )
    .eq("id", breederId)
    .maybeSingle();

  if (breederError || !breeder) {
    record(checks, "breeder lookup", false, breederError?.message ?? "breeder not found");
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const breederRow = breeder as BreederRow;
  const ownerOk = breederRow.user_id === user.id;
  record(
    checks,
    "breeder user_id match",
    ownerOk,
    ownerOk ? undefined : "SEC_TEST_REVIEW_BREEDER_ID does not belong to logged-in breeder",
  );

  if (!ownerOk) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const eligible = isBreederEligibleForPhase5(breederRow);
  record(
    checks,
    "breeder review state",
    eligible,
    eligible
      ? undefined
      : "expected approved/verified/verified with valid registration_expires_at — run prepare:sec-test-review-breeder first",
  );

  if (!eligible) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const approvePetId = await ensureUnderReviewPet(
    supabase,
    breederId,
    user.id,
    APPROVE_PET_NAME,
    checks,
    "prepare approve pet",
  );

  const returnPetId = await ensureUnderReviewPet(
    supabase,
    breederId,
    user.id,
    RETURN_PET_NAME,
    checks,
    "prepare return pet",
  );

  if (!approvePetId || !returnPetId) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const approveFinalOk = await verifyFinalPetState(
    supabase,
    breederId,
    approvePetId,
    APPROVE_PET_NAME,
    checks,
    "final approve pet state",
  );

  const returnFinalOk = await verifyFinalPetState(
    supabase,
    breederId,
    returnPetId,
    RETURN_PET_NAME,
    checks,
    "final return pet state",
  );

  if (!approveFinalOk || !returnFinalOk) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Preparation completed");
  console.log("");
  console.log(`SEC_TEST_ADMIN_APPROVE_PET_ID=${approvePetId}`);
  console.log(`SEC_TEST_ADMIN_RETURN_PET_ID=${returnPetId}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  console.log("");
  console.log("Preparation aborted");
  process.exitCode = 1;
});

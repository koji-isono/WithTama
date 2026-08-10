/**
 * pets status Trigger / RLS security test (phases 1–4).
 *
 * Authenticates via publishable key + signInWithPassword,
 * then issues direct PostgREST queries (bypassing Server Actions).
 *
 * Requires (phases 1–3 — breeder A):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_OTHER_PET_ID (phase 3 only — breeder B's [SEC-TEST-B] pet)
 *
 * Requires (phase 4 — admin):
 *   SEC_TEST_ADMIN_EMAIL
 *   SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_ADMIN_REVIEW_PET_ID ([SEC-TEST] pet, status = under_review)
 *   SEC_TEST_ADMIN_RETURN_PET_ID ([SEC-TEST] pet, status = under_review)
 *   SEC_TEST_ADMIN_DRAFT_PET_ID ([SEC-TEST] pet, status = draft)
 *
 * Phase 5 (admin review RPCs): scripts/test-pet-review-rpcs.mts
 *   SEC_TEST_ADMIN_APPROVE_PET_ID / SEC_TEST_ADMIN_RETURN_PET_ID
 *
 * Phase 5 prep (before test:pet-review-rpcs if breeder is still submitted):
 *   scripts/prepare-sec-test-review-breeder.mts — SEC_TEST_REVIEW_BREEDER_ID
 *
 * Usage:
 *   npx tsx scripts/test-pets-status-trigger.mts           # phases 1–3
 *   npx tsx scripts/test-pets-status-trigger.mts --phase3  # phase 3 only
 *   npx tsx scripts/test-pets-status-trigger.mts --phase4  # phase 4 only
 *
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SEC_TEST_PREFIX = "[SEC-TEST]";
const SEC_TEST_B_PREFIX = "[SEC-TEST-B]";
const OTHER_BREEDER_PET_UPDATE_NAME = "[SEC-TEST-B] RLS Other Breeder Pet";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type TestPet = {
  id: string;
  management_name: string;
  status: string;
};

type RunPhase = "all" | "phase3" | "phase4";

function parseRunPhase(argv: string[]): RunPhase {
  if (argv.includes("--phase4")) {
    return "phase4";
  }
  if (argv.includes("--phase3")) {
    return "phase3";
  }
  return "all";
}

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

function summarize(checks: Check[]): void {
  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;
  console.log("");
  console.log(`${passed} passed / ${failed} failed`);
}

function finish(checks: Check[]): void {
  summarize(checks);
  if (checks.some((check) => !check.passed)) {
    process.exitCode = 1;
  }
}

async function findSecTestDraftPet(
  supabase: SupabaseClient,
  breederId: string,
): Promise<TestPet | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status")
    .eq("breeder_id", breederId)
    .eq("status", "draft")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

function isTriggerRejection(error: { message: string } | null): boolean {
  return error != null && error.message.includes("invalid status transition");
}

function isRlsUpdateBlocked(
  error: { message: string } | null,
  rows: unknown[] | null | undefined,
): boolean {
  return error == null && (rows?.length ?? 0) === 0;
}

async function selectPetStatus(
  supabase: SupabaseClient,
  petId: string,
): Promise<{ status: string | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("pets")
    .select("status")
    .eq("id", petId)
    .maybeSingle();

  if (error) {
    return { status: null, errorMessage: error.message };
  }

  return { status: data?.status ?? null };
}

async function loadBreederId(
  supabase: SupabaseClient,
  user: User,
  checks: Check[],
): Promise<string | null> {
  const { data, error } = await supabase
    .from("breeders")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const ok = error == null && data?.id != null;
  record(checks, "breeder lookup", ok, error?.message);

  return ok ? data.id : null;
}

async function authenticateBreederA(checks: Check[]): Promise<{
  supabase: SupabaseClient;
  user: User;
  breederId: string;
} | null> {
  let supabaseUrl: string;
  let publishableKey: string;
  let email: string;
  let password: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    email = requireEnv("SEC_TEST_BREEDER_EMAIL");
    password = requireEnv("SEC_TEST_BREEDER_PASSWORD");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    console.log(`FAIL environment (${message})`);
    return null;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  record(checks, "authentication", signInError == null, signInError?.message);

  if (signInError) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  record(checks, "user lookup", userError == null && user != null, userError?.message);

  if (userError || !user) {
    return null;
  }

  const breederId = await loadBreederId(supabase, user, checks);
  if (!breederId) {
    return null;
  }

  return { supabase, user, breederId };
}

function isAdminRole(user: User): boolean {
  const role = user.app_metadata?.role;
  return role === "admin";
}

async function authenticateAdmin(checks: Check[]): Promise<{
  supabase: SupabaseClient;
  user: User;
} | null> {
  let supabaseUrl: string;
  let publishableKey: string;
  let email: string;
  let password: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    email = requireEnv("SEC_TEST_ADMIN_EMAIL");
    password = requireEnv("SEC_TEST_ADMIN_PASSWORD");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    console.log(`FAIL environment (${message})`);
    return null;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  record(checks, "authentication", signInError == null, signInError?.message);

  if (signInError) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  record(
    checks,
    "admin role",
    userError == null && user != null && isAdminRole(user),
    userError?.message ??
      (user && !isAdminRole(user) ? "app_metadata.role is not admin" : undefined),
  );

  if (userError || !user || !isAdminRole(user)) {
    return null;
  }

  return { supabase, user };
}

async function loadSecTestPetById(
  supabase: SupabaseClient,
  petId: string,
  expectedStatus: string,
  checks: Check[],
  lookupName: string,
): Promise<TestPet | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status")
    .eq("id", petId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    record(checks, lookupName, false, error?.message ?? "pet not found or not visible");
    return null;
  }

  if (!data.management_name.startsWith(SEC_TEST_PREFIX)) {
    record(
      checks,
      lookupName,
      false,
      "management_name is not [SEC-TEST] — aborting to protect non-test data",
    );
    return null;
  }

  if (data.status !== expectedStatus) {
    record(checks, lookupName, false, `expected status ${expectedStatus}, got ${data.status}`);
    return null;
  }

  record(checks, lookupName, true);
  return data;
}

async function runPhase4(supabase: SupabaseClient, checks: Check[]): Promise<void> {
  let reviewPetId: string;
  let returnPetId: string;
  let draftPetId: string;

  try {
    reviewPetId = requireEnv("SEC_TEST_ADMIN_REVIEW_PET_ID");
    returnPetId = requireEnv("SEC_TEST_ADMIN_RETURN_PET_ID");
    draftPetId = requireEnv("SEC_TEST_ADMIN_DRAFT_PET_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "missing admin test pet id";
    record(checks, "review pet lookup", false, message);
    console.log("");
    console.log("Aborting phase 4 (missing SEC_TEST_ADMIN_* pet id environment variables).");
    return;
  }

  const reviewPet = await loadSecTestPetById(
    supabase,
    reviewPetId,
    "under_review",
    checks,
    "review pet lookup",
  );
  if (!reviewPet) {
    console.log("");
    console.log("Aborting phase 4 UPDATE tests (review pet unavailable).");
    return;
  }

  const { data: publishRows, error: publishError } = await supabase
    .from("pets")
    .update({ status: "published" })
    .eq("id", reviewPet.id)
    .eq("status", "under_review")
    .select("id, status");

  if (isRlsUpdateBlocked(publishError, publishRows)) {
    record(
      checks,
      "admin under_review -> published",
      false,
      "RLS blocked UPDATE (0 rows) — admin pets UPDATE policy or review RPC required before trigger can be tested",
    );
    record(checks, "status became published", false, "skipped");
  } else {
    const publishOk = publishError == null && (publishRows?.length ?? 0) === 1;
    record(
      checks,
      "admin under_review -> published",
      publishOk,
      publishError?.message ?? (publishOk ? undefined : "expected 1 updated row"),
    );

    const afterPublish = await selectPetStatus(supabase, reviewPet.id);
    const becamePublished = afterPublish.status === "published";
    record(
      checks,
      "status became published",
      becamePublished,
      afterPublish.errorMessage ??
        (becamePublished ? undefined : `status is ${afterPublish.status ?? "unknown"}`),
    );
  }

  const returnPet = await loadSecTestPetById(
    supabase,
    returnPetId,
    "under_review",
    checks,
    "return pet lookup",
  );
  if (!returnPet) {
    console.log("");
    console.log("Aborting phase 4 return tests (return pet unavailable).");
    return;
  }

  const { data: returnRows, error: returnError } = await supabase
    .from("pets")
    .update({ status: "draft" })
    .eq("id", returnPet.id)
    .eq("status", "under_review")
    .select("id, status");

  if (isRlsUpdateBlocked(returnError, returnRows)) {
    record(
      checks,
      "admin under_review -> draft",
      false,
      "RLS blocked UPDATE (0 rows) — admin pets UPDATE policy or review RPC required before trigger can be tested",
    );
    record(checks, "status became draft", false, "skipped");
  } else {
    const returnOk = returnError == null && (returnRows?.length ?? 0) === 1;
    record(
      checks,
      "admin under_review -> draft",
      returnOk,
      returnError?.message ?? (returnOk ? undefined : "expected 1 updated row"),
    );

    const afterReturn = await selectPetStatus(supabase, returnPet.id);
    const becameDraft = afterReturn.status === "draft";
    record(
      checks,
      "status became draft",
      becameDraft,
      afterReturn.errorMessage ??
        (becameDraft ? undefined : `status is ${afterReturn.status ?? "unknown"}`),
    );
  }

  const draftPet = await loadSecTestPetById(
    supabase,
    draftPetId,
    "draft",
    checks,
    "draft pet lookup",
  );
  if (!draftPet) {
    console.log("");
    console.log("Aborting phase 4 reject tests (draft pet unavailable).");
    return;
  }

  const { data: rejectRows, error: rejectError } = await supabase
    .from("pets")
    .update({ status: "published" })
    .eq("id", draftPet.id)
    .eq("status", "draft")
    .select("id, status");

  if (isRlsUpdateBlocked(rejectError, rejectRows)) {
    record(
      checks,
      "admin draft -> published rejected by trigger",
      false,
      "RLS blocked UPDATE (0 rows) — cannot reach trigger; admin pets UPDATE policy required",
    );
    record(checks, "status remained draft", false, "skipped");
    return;
  }

  record(
    checks,
    "admin draft -> published rejected by trigger",
    isTriggerRejection(rejectError),
    rejectError?.message,
  );

  const afterReject = await selectPetStatus(supabase, draftPet.id);
  const remainedDraft = afterReject.status === "draft";
  record(
    checks,
    "status remained draft",
    remainedDraft,
    afterReject.errorMessage ??
      (remainedDraft ? undefined : `status is ${afterReject.status ?? "unknown"}`),
  );
}

async function runPhase12(
  supabase: SupabaseClient,
  breederId: string,
  checks: Check[],
): Promise<void> {
  let testPet: TestPet | null;
  try {
    testPet = await findSecTestDraftPet(supabase, breederId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "query failed";
    record(checks, "test pet lookup", false, message);
    return;
  }

  if (!testPet) {
    record(
      checks,
      "test pet lookup",
      false,
      `no draft pet with management_name like '${SEC_TEST_PREFIX}%'`,
    );
    console.log("");
    console.log("Aborting phase 1–2 UPDATE tests (no safe target data).");
    return;
  }

  record(checks, "test pet lookup", true, `pet id ${testPet.id}`);

  const { data: normalRows, error: normalError } = await supabase
    .from("pets")
    .update({ management_name: testPet.management_name })
    .eq("id", testPet.id)
    .select("id");

  const normalOk = normalError == null && (normalRows?.length ?? 0) === 1;
  record(
    checks,
    "normal update",
    normalOk,
    normalError?.message ?? (normalOk ? undefined : "expected 1 updated row"),
  );

  const { error: triggerError } = await supabase
    .from("pets")
    .update({ status: "published" })
    .eq("id", testPet.id)
    .select("id, status");

  record(
    checks,
    "draft -> published rejected by trigger",
    isTriggerRejection(triggerError),
    triggerError?.message,
  );

  const { data: recheckRow, error: recheckError } = await supabase
    .from("pets")
    .select("status")
    .eq("id", testPet.id)
    .maybeSingle();

  const statusUnchanged = recheckError == null && recheckRow?.status === "draft";
  record(
    checks,
    "status remained draft",
    statusUnchanged,
    recheckError?.message ??
      (statusUnchanged ? undefined : `status is ${recheckRow?.status ?? "unknown"}`),
  );

  const { data: submitRows, error: submitError } = await supabase
    .from("pets")
    .update({ status: "under_review" })
    .eq("id", testPet.id)
    .eq("status", "draft")
    .select("id, status");

  const submitOk = submitError == null && (submitRows?.length ?? 0) === 1;
  record(
    checks,
    "draft -> under_review",
    submitOk,
    submitError?.message ?? (submitOk ? undefined : "expected 1 updated row"),
  );

  const afterSubmit = await selectPetStatus(supabase, testPet.id);
  const becameUnderReview = afterSubmit.status === "under_review";
  record(
    checks,
    "status became under_review",
    becameUnderReview,
    afterSubmit.errorMessage ??
      (becameUnderReview ? undefined : `status is ${afterSubmit.status ?? "unknown"}`),
  );

  const { error: publishedError } = await supabase
    .from("pets")
    .update({ status: "published" })
    .eq("id", testPet.id)
    .select("id, status");

  record(
    checks,
    "under_review -> published rejected by trigger",
    isTriggerRejection(publishedError),
    publishedError?.message,
  );

  const afterPublishedAttempt = await selectPetStatus(supabase, testPet.id);
  const remainedUnderReviewAfterPublished = afterPublishedAttempt.status === "under_review";
  record(
    checks,
    "status remained under_review after published attempt",
    remainedUnderReviewAfterPublished,
    afterPublishedAttempt.errorMessage ??
      (remainedUnderReviewAfterPublished
        ? undefined
        : `status is ${afterPublishedAttempt.status ?? "unknown"}`),
  );

  const { error: draftError } = await supabase
    .from("pets")
    .update({ status: "draft" })
    .eq("id", testPet.id)
    .select("id, status");

  record(
    checks,
    "under_review -> draft rejected by trigger",
    isTriggerRejection(draftError),
    draftError?.message,
  );

  const afterDraftAttempt = await selectPetStatus(supabase, testPet.id);
  const remainedUnderReviewAfterDraft = afterDraftAttempt.status === "under_review";
  record(
    checks,
    "status remained under_review after draft attempt",
    remainedUnderReviewAfterDraft,
    afterDraftAttempt.errorMessage ??
      (remainedUnderReviewAfterDraft
        ? undefined
        : `status is ${afterDraftAttempt.status ?? "unknown"}`),
  );
}

async function runPhase3(supabase: SupabaseClient, checks: Check[]): Promise<void> {
  const { data: hiddenPets, error: hiddenError } = await supabase
    .from("pets")
    .select("id")
    .like("management_name", `${SEC_TEST_B_PREFIX}%`)
    .is("deleted_at", null);

  const hiddenOk = hiddenError == null && (hiddenPets?.length ?? 0) === 0;
  record(
    checks,
    "other breeder draft pet hidden by RLS",
    hiddenOk,
    hiddenError?.message ?? (hiddenOk ? undefined : `visible count ${hiddenPets?.length ?? 0}`),
  );

  let otherPetId: string;
  try {
    otherPetId = requireEnv("SEC_TEST_OTHER_PET_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "missing other pet id";
    record(checks, "other breeder pet update blocked by RLS", false, message);
    record(checks, "other breeder pet still hidden after update attempt", false, "skipped");
    return;
  }

  const { data: updateRows, error: updateError } = await supabase
    .from("pets")
    .update({ management_name: OTHER_BREEDER_PET_UPDATE_NAME })
    .eq("id", otherPetId)
    .select("id");

  const updateBlocked = updateError == null && (updateRows?.length ?? 0) === 0;
  record(
    checks,
    "other breeder pet update blocked by RLS",
    updateBlocked,
    updateError?.message ?? (updateBlocked ? undefined : `updated ${updateRows?.length ?? 0} rows`),
  );

  const { data: stillHiddenPets, error: stillHiddenError } = await supabase
    .from("pets")
    .select("id")
    .like("management_name", `${SEC_TEST_B_PREFIX}%`)
    .is("deleted_at", null);

  const stillHiddenOk = stillHiddenError == null && (stillHiddenPets?.length ?? 0) === 0;
  record(
    checks,
    "other breeder pet still hidden after update attempt",
    stillHiddenOk,
    stillHiddenError?.message ??
      (stillHiddenOk ? undefined : `visible count ${stillHiddenPets?.length ?? 0}`),
  );
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const runPhase = parseRunPhase(process.argv.slice(2));

  if (runPhase === "phase4") {
    const adminSession = await authenticateAdmin(checks);
    if (adminSession) {
      await runPhase4(adminSession.supabase, checks);
    }
    finish(checks);
    return;
  }

  const session = await authenticateBreederA(checks);
  if (!session) {
    finish(checks);
    return;
  }

  const { supabase, breederId } = session;

  if (runPhase === "all") {
    await runPhase12(supabase, breederId, checks);
  }

  await runPhase3(supabase, checks);

  finish(checks);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  process.exitCode = 1;
});

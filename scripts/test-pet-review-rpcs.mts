/**
 * Admin pet review RPC security test (phase 5).
 *
 * Tests approve_pet_for_publish / return_pet_review via authenticated JWT + .rpc().
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_ADMIN_EMAIL
 *   SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_ADMIN_APPROVE_PET_ID ([SEC-TEST] pet, status = under_review)
 *   SEC_TEST_ADMIN_RETURN_PET_ID ([SEC-TEST] pet, status = under_review, different from approve)
 *
 * Usage:
 *   npx tsx scripts/test-pet-review-rpcs.mts
 *   npm run test:pet-review-rpcs
 *
 * Related: scripts/test-pets-status-trigger.mts (phases 1–4 — Trigger / RLS)
 * Prep: scripts/prepare-sec-test-review-breeder.mts, scripts/prepare-sec-test-review-pets.mts
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SEC_TEST_PREFIX = "[SEC-TEST]";
const APPROVE_PET_NAME_PREFIX = "[SEC-TEST] Review RPC Approve Pet";
const RETURN_COMMENT = "SEC-TEST return reason";
const UNAUTHORIZED_RETURN_COMMENT = "SEC-TEST unauthorized return";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type ReviewTestPet = {
  id: string;
  management_name: string;
  status: string;
  published_at: string | null;
  breeder_id: string;
};

type BreederEligibility = {
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

function isAdminRole(user: User): boolean {
  return user.app_metadata?.role === "admin";
}

function rpcMessage(error: { message: string } | null): string {
  return error?.message ?? "";
}

function isAdminRequiredError(error: { message: string } | null): boolean {
  return rpcMessage(error).toLowerCase().includes("admin required");
}

function isReturnCommentRequiredError(error: { message: string } | null): boolean {
  return rpcMessage(error).toLowerCase().includes("return comment required");
}

function isInvalidPetStatusError(error: { message: string } | null): boolean {
  return rpcMessage(error).toLowerCase().includes("invalid pet status");
}

function createAnonClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<User | null> {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  return user;
}

async function fetchSecTestPet(
  supabase: SupabaseClient,
  petId: string,
): Promise<{ pet: ReviewTestPet | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status, published_at, breeder_id")
    .eq("id", petId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return { pet: null, errorMessage: error?.message ?? "pet not found or not visible" };
  }

  if (!data.management_name.includes(SEC_TEST_PREFIX)) {
    return {
      pet: null,
      errorMessage:
        "management_name does not include [SEC-TEST] — aborting to protect non-test data",
    };
  }

  return { pet: data as ReviewTestPet };
}

async function findUnderReviewApprovePet(supabase: SupabaseClient): Promise<ReviewTestPet | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status, published_at, breeder_id")
    .like("management_name", `${APPROVE_PET_NAME_PREFIX}%`)
    .eq("status", "under_review")
    .is("deleted_at", null)
    .is("published_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ReviewTestPet;
}

async function resolveApprovePet(
  supabase: SupabaseClient,
  envPetId: string,
  checks: Check[],
): Promise<ReviewTestPet | null> {
  const { pet: envPet, errorMessage: envError } = await fetchSecTestPet(supabase, envPetId);

  if (envPet && envPet.status === "under_review") {
    record(checks, "approve pet lookup", true, envPet.id);
    return envPet;
  }

  const fallback = await findUnderReviewApprovePet(supabase);

  if (fallback) {
    record(
      checks,
      "approve pet lookup",
      true,
      envPet
        ? `fallback from stale env id (${envPet.status}) to ${fallback.management_name}`
        : `fallback (${fallback.management_name})`,
    );
    return fallback;
  }

  record(
    checks,
    "approve pet lookup",
    false,
    envPet
      ? `expected status under_review, got ${envPet.status}`
      : (envError ?? "no under_review approve pet — run prepare:sec-test-review-pets"),
  );
  return null;
}

async function loadSecTestPet(
  supabase: SupabaseClient,
  petId: string,
  expectedStatus: string,
  checks: Check[],
  lookupName: string,
): Promise<ReviewTestPet | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status, published_at, breeder_id")
    .eq("id", petId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    record(checks, lookupName, false, error?.message ?? "pet not found or not visible");
    return null;
  }

  if (!data.management_name.includes(SEC_TEST_PREFIX)) {
    record(
      checks,
      lookupName,
      false,
      "management_name does not include [SEC-TEST] — aborting to protect non-test data",
    );
    return null;
  }

  if (data.status !== expectedStatus) {
    record(checks, lookupName, false, `expected status ${expectedStatus}, got ${data.status}`);
    return null;
  }

  record(checks, lookupName, true);
  return data as ReviewTestPet;
}

async function loadBreederEligibility(
  supabase: SupabaseClient,
  breederId: string,
): Promise<{ eligibility: BreederEligibility | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("breeders")
    .select(
      "review_status, identity_verification_status, business_verification_status, registration_expires_at",
    )
    .eq("id", breederId)
    .maybeSingle();

  if (error || !data) {
    return { eligibility: null, errorMessage: error?.message ?? "breeder not found" };
  }

  return { eligibility: data as BreederEligibility };
}

function isBreederEligibleForPublish(eligibility: BreederEligibility): boolean {
  if (eligibility.review_status !== "approved") {
    return false;
  }
  if (eligibility.identity_verification_status !== "verified") {
    return false;
  }
  if (eligibility.business_verification_status !== "verified") {
    return false;
  }
  if (eligibility.registration_expires_at == null) {
    return false;
  }

  const expiresAt = new Date(eligibility.registration_expires_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiresAt.setHours(0, 0, 0, 0);

  return expiresAt >= today;
}

async function countReviewLogs(
  supabase: SupabaseClient,
  petId: string,
  action: "approved" | "returned",
): Promise<{ count: number; errorMessage?: string }> {
  const { count, error } = await supabase
    .from("pet_review_logs")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId)
    .eq("action", action);

  if (error) {
    return { count: -1, errorMessage: error.message };
  }

  return { count: count ?? 0 };
}

async function fetchPetSnapshot(
  supabase: SupabaseClient,
  petId: string,
): Promise<{ status: string | null; published_at: string | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("pets")
    .select("status, published_at")
    .eq("id", petId)
    .maybeSingle();

  if (error || !data) {
    return { status: null, published_at: null, errorMessage: error?.message ?? "pet not found" };
  }

  return { status: data.status, published_at: data.published_at };
}

async function fetchLatestReturnedLog(
  supabase: SupabaseClient,
  petId: string,
): Promise<{
  actor_user_id: string | null;
  comment: string | null;
  errorMessage?: string;
}> {
  const { data, error } = await supabase
    .from("pet_review_logs")
    .select("actor_user_id, comment")
    .eq("pet_id", petId)
    .eq("action", "returned")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { actor_user_id: null, comment: null, errorMessage: error.message };
  }

  return {
    actor_user_id: data?.actor_user_id ?? null,
    comment: data?.comment ?? null,
  };
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;
  let publishableKey: string;
  let adminEmail: string;
  let adminPassword: string;
  let breederEmail: string;
  let breederPassword: string;
  let approvePetId: string;
  let returnPetId: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
    adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
    breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
    breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
    approvePetId = requireEnv("SEC_TEST_ADMIN_APPROVE_PET_ID");
    returnPetId = requireEnv("SEC_TEST_ADMIN_RETURN_PET_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    console.log(`FAIL environment (${message})`);
    finish(checks);
    return;
  }

  if (approvePetId === returnPetId) {
    record(
      checks,
      "approve and return pet ids distinct",
      false,
      "SEC_TEST_ADMIN_APPROVE_PET_ID and SEC_TEST_ADMIN_RETURN_PET_ID must differ",
    );
    finish(checks);
    return;
  }

  const adminClient = createAnonClient(supabaseUrl, publishableKey);
  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(checks, "admin authentication", adminUser != null);

  if (!adminUser || !isAdminRole(adminUser)) {
    record(
      checks,
      "admin role",
      false,
      adminUser ? "app_metadata.role is not admin" : "sign-in failed",
    );
    finish(checks);
    return;
  }
  record(checks, "admin role", true);

  const approvePet = await resolveApprovePet(adminClient, approvePetId, checks);
  const returnPet = await loadSecTestPet(
    adminClient,
    returnPetId,
    "under_review",
    checks,
    "return pet lookup",
  );

  if (!approvePet || !returnPet) {
    console.log("");
    console.log("Aborting phase 5 (test pets unavailable or invalid status).");
    finish(checks);
    return;
  }

  const { eligibility, errorMessage: eligibilityError } = await loadBreederEligibility(
    adminClient,
    approvePet.breeder_id,
  );

  if (!eligibility) {
    record(checks, "approve pet breeder eligibility", false, eligibilityError);
    console.log("");
    console.log("Aborting phase 5 (cannot verify breeder publish conditions).");
    finish(checks);
    return;
  }

  const eligible = isBreederEligibleForPublish(eligibility);
  record(
    checks,
    "approve pet breeder eligibility",
    eligible,
    eligible
      ? undefined
      : "breeder does not meet Decision No.107 conditions — fix test data, do not mutate",
  );

  if (!eligible) {
    console.log("");
    console.log("Aborting phase 5 RPC mutation tests (breeder not eligible for publish).");
    finish(checks);
    return;
  }

  const approvedCountBefore = await countReviewLogs(adminClient, approvePet.id, "approved");
  const returnedCountBefore = await countReviewLogs(adminClient, returnPet.id, "returned");

  if (approvedCountBefore.errorMessage || returnedCountBefore.errorMessage) {
    record(
      checks,
      "review log baseline",
      false,
      approvedCountBefore.errorMessage ?? returnedCountBefore.errorMessage,
    );
    finish(checks);
    return;
  }
  record(checks, "review log baseline", true);

  const approvePublishedAtBefore = approvePet.published_at;

  // TEST 1: non-admin approve rejected
  const breederClient = createAnonClient(supabaseUrl, publishableKey);
  const breederUser = await signIn(breederClient, breederEmail, breederPassword);
  record(checks, "breeder authentication", breederUser != null);

  if (!breederUser || isAdminRole(breederUser)) {
    record(
      checks,
      "breeder non-admin role",
      false,
      breederUser ? "account has admin role" : "sign-in failed",
    );
    finish(checks);
    return;
  }
  record(checks, "breeder non-admin role", true);

  const { error: nonAdminApproveError } = await breederClient.rpc("approve_pet_for_publish", {
    p_pet_id: approvePet.id,
  });

  record(
    checks,
    "non-admin approve rejected",
    isAdminRequiredError(nonAdminApproveError),
    rpcMessage(nonAdminApproveError) || "expected admin required error",
  );

  const afterNonAdminApprove = await fetchPetSnapshot(adminClient, approvePet.id);
  const approveUnchangedAfterNonAdmin =
    afterNonAdminApprove.status === "under_review" &&
    afterNonAdminApprove.published_at === approvePublishedAtBefore;
  record(
    checks,
    "approve pet unchanged after non-admin approve",
    approveUnchangedAfterNonAdmin,
    afterNonAdminApprove.errorMessage ??
      (approveUnchangedAfterNonAdmin
        ? undefined
        : `status=${afterNonAdminApprove.status ?? "unknown"}`),
  );

  const approvedCountAfterNonAdmin = await countReviewLogs(adminClient, approvePet.id, "approved");
  record(
    checks,
    "no approved log after non-admin approve",
    approvedCountAfterNonAdmin.count === approvedCountBefore.count,
    approvedCountAfterNonAdmin.errorMessage,
  );

  // TEST 2: non-admin return rejected
  const { error: nonAdminReturnError } = await breederClient.rpc("return_pet_review", {
    p_pet_id: returnPet.id,
    p_comment: UNAUTHORIZED_RETURN_COMMENT,
  });

  record(
    checks,
    "non-admin return rejected",
    isAdminRequiredError(nonAdminReturnError),
    rpcMessage(nonAdminReturnError) || "expected admin required error",
  );

  const afterNonAdminReturn = await fetchPetSnapshot(adminClient, returnPet.id);
  record(
    checks,
    "return pet unchanged after non-admin return",
    afterNonAdminReturn.status === "under_review",
    afterNonAdminReturn.errorMessage ??
      (afterNonAdminReturn.status === "under_review"
        ? undefined
        : `status=${afterNonAdminReturn.status ?? "unknown"}`),
  );

  const returnedCountAfterNonAdmin = await countReviewLogs(adminClient, returnPet.id, "returned");
  record(
    checks,
    "no returned log after non-admin return",
    returnedCountAfterNonAdmin.count === returnedCountBefore.count,
    returnedCountAfterNonAdmin.errorMessage,
  );

  // TEST 3: empty return comment rejected
  const { error: emptyCommentError } = await adminClient.rpc("return_pet_review", {
    p_pet_id: returnPet.id,
    p_comment: "   ",
  });

  record(
    checks,
    "empty return comment rejected",
    isReturnCommentRequiredError(emptyCommentError),
    rpcMessage(emptyCommentError) || "expected return comment required error",
  );

  const afterEmptyComment = await fetchPetSnapshot(adminClient, returnPet.id);
  record(
    checks,
    "return pet unchanged after empty comment",
    afterEmptyComment.status === "under_review",
    afterEmptyComment.errorMessage,
  );

  const returnedCountAfterEmptyComment = await countReviewLogs(
    adminClient,
    returnPet.id,
    "returned",
  );
  record(
    checks,
    "no returned log after empty comment",
    returnedCountAfterEmptyComment.count === returnedCountBefore.count,
    returnedCountAfterEmptyComment.errorMessage,
  );

  // TEST 4: admin approve
  const { error: adminApproveError } = await adminClient.rpc("approve_pet_for_publish", {
    p_pet_id: approvePet.id,
  });

  record(
    checks,
    "admin approve RPC",
    adminApproveError == null,
    rpcMessage(adminApproveError) || undefined,
  );

  const afterAdminApprove = await fetchPetSnapshot(adminClient, approvePet.id);
  record(
    checks,
    "approved status",
    afterAdminApprove.status === "published",
    afterAdminApprove.errorMessage ??
      (afterAdminApprove.status === "published"
        ? undefined
        : `status=${afterAdminApprove.status ?? "unknown"}`),
  );

  record(
    checks,
    "published_at set",
    afterAdminApprove.published_at != null,
    afterAdminApprove.errorMessage ??
      (afterAdminApprove.published_at != null ? undefined : "published_at is null"),
  );

  const approvedCountAfterApprove = await countReviewLogs(adminClient, approvePet.id, "approved");
  const approvedLogAdded = approvedCountAfterApprove.count === approvedCountBefore.count + 1;
  record(
    checks,
    "approved review log",
    approvedLogAdded && !approvedCountAfterApprove.errorMessage,
    approvedCountAfterApprove.errorMessage ??
      (approvedLogAdded
        ? undefined
        : `expected ${approvedCountBefore.count + 1} approved logs, got ${approvedCountAfterApprove.count}`),
  );

  // TEST 5: admin return
  const { error: adminReturnError } = await adminClient.rpc("return_pet_review", {
    p_pet_id: returnPet.id,
    p_comment: RETURN_COMMENT,
  });

  record(
    checks,
    "admin return RPC",
    adminReturnError == null,
    rpcMessage(adminReturnError) || undefined,
  );

  const afterAdminReturn = await fetchPetSnapshot(adminClient, returnPet.id);
  record(
    checks,
    "returned status",
    afterAdminReturn.status === "draft",
    afterAdminReturn.errorMessage ??
      (afterAdminReturn.status === "draft"
        ? undefined
        : `status=${afterAdminReturn.status ?? "unknown"}`),
  );

  record(
    checks,
    "return pet published_at null",
    afterAdminReturn.published_at == null,
    afterAdminReturn.errorMessage ??
      (afterAdminReturn.published_at == null ? undefined : "published_at is not null"),
  );

  const returnedCountAfterReturn = await countReviewLogs(adminClient, returnPet.id, "returned");
  const returnedLogAdded = returnedCountAfterReturn.count === returnedCountBefore.count + 1;
  record(
    checks,
    "returned review log",
    returnedLogAdded && !returnedCountAfterReturn.errorMessage,
    returnedCountAfterReturn.errorMessage ??
      (returnedLogAdded
        ? undefined
        : `expected ${returnedCountBefore.count + 1} returned logs, got ${returnedCountAfterReturn.count}`),
  );

  const latestReturned = await fetchLatestReturnedLog(adminClient, returnPet.id);
  const returnedLogActorOk = latestReturned.actor_user_id === adminUser.id;
  const returnedLogCommentOk = latestReturned.comment === RETURN_COMMENT;
  record(
    checks,
    "returned log actor and comment",
    returnedLogActorOk && returnedLogCommentOk && !latestReturned.errorMessage,
    latestReturned.errorMessage ??
      (!returnedLogActorOk
        ? "actor_user_id mismatch"
        : !returnedLogCommentOk
          ? "comment mismatch"
          : undefined),
  );

  // TEST 6: duplicate approve rejected
  const approvedCountBeforeDuplicate = await countReviewLogs(
    adminClient,
    approvePet.id,
    "approved",
  );

  const { error: duplicateApproveError } = await adminClient.rpc("approve_pet_for_publish", {
    p_pet_id: approvePet.id,
  });

  record(
    checks,
    "duplicate approve rejected",
    isInvalidPetStatusError(duplicateApproveError),
    rpcMessage(duplicateApproveError) || "expected invalid pet status error",
  );

  const afterDuplicateApprove = await fetchPetSnapshot(adminClient, approvePet.id);
  record(
    checks,
    "approve pet still published after duplicate approve",
    afterDuplicateApprove.status === "published",
    afterDuplicateApprove.errorMessage,
  );

  const approvedCountAfterDuplicate = await countReviewLogs(adminClient, approvePet.id, "approved");
  record(
    checks,
    "no extra approved log after duplicate approve",
    approvedCountAfterDuplicate.count === approvedCountBeforeDuplicate.count,
    approvedCountAfterDuplicate.errorMessage,
  );

  finish(checks);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  process.exitCode = 1;
});

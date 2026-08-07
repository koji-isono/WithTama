/**
 * pets status Trigger / RLS security test (phases 1–3).
 *
 * Authenticates as test breeder A via publishable key + signInWithPassword,
 * then issues direct PostgREST queries (bypassing Server Actions).
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_OTHER_PET_ID (phase 3 only — breeder B's [SEC-TEST-B] pet)
 *
 * Usage:
 *   npx tsx scripts/test-pets-status-trigger.mts           # phases 1–3
 *   npx tsx scripts/test-pets-status-trigger.mts --phase3  # phase 3 only
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

function parseRunPhase(argv: string[]): "all" | "phase3" {
  return argv.includes("--phase3") ? "phase3" : "all";
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

  record(
    checks,
    "user lookup",
    userError == null && user != null,
    userError?.message,
  );

  if (userError || !user) {
    return null;
  }

  const breederId = await loadBreederId(supabase, user, checks);
  if (!breederId) {
    return null;
  }

  return { supabase, user, breederId };
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
    recheckError?.message ?? (statusUnchanged ? undefined : `status is ${recheckRow?.status ?? "unknown"}`),
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

  const stillHiddenOk =
    stillHiddenError == null && (stillHiddenPets?.length ?? 0) === 0;
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

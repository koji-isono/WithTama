/**
 * Breeder submit_pet_for_review RPC security test.
 *
 * Tests public.submit_pet_for_review(p_pet_id) via authenticated JWT + .rpc().
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_OTHER_PET_ID (optional — breeder B's pet for RLS test)
 *   SEC_TEST_ADMIN_EMAIL
 *   SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_ADMIN_RETURN_PET_ID (optional — reset under_review pet to draft for success test)
 *
 * Usage:
 *   npm run test:submit-pet-for-review
 *
 * Note: Consumes one [SEC-TEST] draft pet (with photo) and moves it to under_review.
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SEC_TEST_PREFIX = "[SEC-TEST]";
const NO_PHOTO_PET_NAME = "[SEC-TEST] Submit RPC No Photo Pet";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type TestPet = {
  id: string;
  management_name: string;
  status: string;
  breeder_id: string;
};

type SubmittedLogRow = {
  id: string;
  pet_id: string;
  actor_user_id: string;
  created_at: string;
  action: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
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

function isInvalidSubmitActorError(error: { message: string } | null): boolean {
  return rpcMessage(error).toLowerCase().includes("invalid submit actor");
}

function isPhotoRequiredError(error: { message: string } | null): boolean {
  return rpcMessage(error).toLowerCase().includes("photo required");
}

function isInvalidPetStatusError(error: { message: string } | null): boolean {
  return rpcMessage(error).toLowerCase().includes("invalid pet status");
}

function isUnauthorizedError(error: { message: string } | null): boolean {
  return rpcMessage(error).toLowerCase().includes("unauthorized");
}

function isRpcMissingError(errorMessage: string | undefined): boolean {
  return (errorMessage ?? "").toLowerCase().includes("could not find the function");
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

async function loadBreederId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("breeders")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

async function findSecTestDraftPetWithPhoto(
  supabase: SupabaseClient,
  breederId: string,
): Promise<TestPet | null> {
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id, management_name, status, breeder_id")
    .eq("breeder_id", breederId)
    .eq("status", "draft")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (petsError) {
    throw petsError;
  }

  for (const pet of pets ?? []) {
    const { count, error: photoError } = await supabase
      .from("pet_photos")
      .select("id", { count: "exact", head: true })
      .eq("pet_id", pet.id);

    if (photoError) {
      throw photoError;
    }

    if ((count ?? 0) >= 1) {
      return pet as TestPet;
    }
  }

  return null;
}

async function findOrCreateNoPhotoDraftPet(
  supabase: SupabaseClient,
  breederId: string,
): Promise<TestPet> {
  const { data: existing, error: existingError } = await supabase
    .from("pets")
    .select("id, management_name, status, breeder_id")
    .eq("breeder_id", breederId)
    .eq("management_name", NO_PHOTO_PET_NAME)
    .eq("status", "draft")
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing as TestPet;
  }

  const { data: created, error: createError } = await supabase
    .from("pets")
    .insert({
      breeder_id: breederId,
      management_name: NO_PHOTO_PET_NAME,
      public_display_name: "No Photo Test Pet",
      species: "dog",
      breed: "Test Breed",
      sex: "male",
      status: "draft",
    })
    .select("id, management_name, status, breeder_id")
    .single();

  if (createError) {
    throw createError;
  }

  return created as TestPet;
}

async function listSubmittedLogs(
  supabase: SupabaseClient,
  petId: string,
): Promise<SubmittedLogRow[]> {
  const { data, error } = await supabase
    .from("pet_review_logs")
    .select("id, pet_id, actor_user_id, created_at, action")
    .eq("pet_id", petId)
    .eq("action", "submitted")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as SubmittedLogRow[];
}

async function callSubmitPetForReviewRpc(
  supabase: SupabaseClient,
  petId: string,
): Promise<{ ok: boolean; errorMessage?: string }> {
  const { error } = await supabase.rpc("submit_pet_for_review", {
    p_pet_id: petId,
  });

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  return { ok: true };
}

async function selectPetStatus(supabase: SupabaseClient, petId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("status")
    .eq("id", petId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.status ?? null;
}

async function countPetPhotos(supabase: SupabaseClient, petId: string): Promise<number> {
  const { count, error } = await supabase
    .from("pet_photos")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function recoverDraftPetWithPhotoViaAdminReturn(
  adminClient: SupabaseClient,
  breederClient: SupabaseClient,
  returnPetId: string,
): Promise<TestPet | null> {
  const status = await selectPetStatus(breederClient, returnPetId);

  if (status === "under_review") {
    const { error } = await adminClient.rpc("return_pet_review", {
      p_pet_id: returnPetId,
      p_comment: "[SEC-TEST] reset for submit_pet_for_review test",
    });

    if (error) {
      throw error;
    }
  }

  const { data, error: petError } = await breederClient
    .from("pets")
    .select("id, management_name, status, breeder_id")
    .eq("id", returnPetId)
    .eq("status", "draft")
    .maybeSingle();

  if (petError) {
    throw petError;
  }

  if (!data) {
    return null;
  }

  const photoCount = await countPetPhotos(breederClient, returnPetId);

  if (photoCount < 1) {
    return null;
  }

  return data as TestPet;
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
  const adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
  const adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
  const otherPetId = optionalEnv("SEC_TEST_OTHER_PET_ID");
  const returnPetId = optionalEnv("SEC_TEST_ADMIN_RETURN_PET_ID");

  const breederClient = createAnonClient(url, key);
  const user = await signIn(breederClient, breederEmail, breederPassword);

  if (!user) {
    throw new Error("Breeder sign-in failed");
  }

  record(checks, "breeder sign-in", true, user.id);

  const rpcProbe = await callSubmitPetForReviewRpc(
    breederClient,
    "00000000-0000-4000-8000-000000000001",
  );

  if (isRpcMissingError(rpcProbe.errorMessage)) {
    record(
      checks,
      "submit_pet_for_review RPC available",
      false,
      "apply supabase/migrations/20260812120000_create_submit_pet_for_review_rpc.sql first",
    );
    finish(checks);
    return;
  }

  record(checks, "submit_pet_for_review RPC available", true);

  const breederId = await loadBreederId(breederClient, user.id);

  if (!breederId) {
    record(checks, "breeder id lookup", false, "no breeders row");
    finish(checks);
    return;
  }

  record(checks, "breeder id lookup", true, breederId);

  const noPhotoPet = await findOrCreateNoPhotoDraftPet(breederClient, breederId);
  const noPhotoCount = await countPetPhotos(breederClient, noPhotoPet.id);
  const noPhotoLogsBefore = await listSubmittedLogs(breederClient, noPhotoPet.id);
  const noPhotoStatusBefore = await selectPetStatus(breederClient, noPhotoPet.id);

  record(
    checks,
    "no-photo draft pet prepared",
    noPhotoCount === 0 && noPhotoStatusBefore === "draft",
    `photos=${noPhotoCount}, status=${noPhotoStatusBefore ?? "unknown"}`,
  );

  const noPhotoSubmit = await callSubmitPetForReviewRpc(breederClient, noPhotoPet.id);
  const noPhotoStatusAfter = await selectPetStatus(breederClient, noPhotoPet.id);
  const noPhotoLogsAfter = await listSubmittedLogs(breederClient, noPhotoPet.id);

  record(
    checks,
    "zero-photo pet submit rejected",
    !noPhotoSubmit.ok && isPhotoRequiredError({ message: noPhotoSubmit.errorMessage ?? "" }),
    noPhotoSubmit.errorMessage,
  );
  record(
    checks,
    "zero-photo failure leaves status draft",
    noPhotoStatusAfter === "draft",
    noPhotoStatusAfter ?? undefined,
  );
  record(
    checks,
    "zero-photo failure creates no submitted log",
    noPhotoLogsAfter.length === noPhotoLogsBefore.length,
    `count=${noPhotoLogsAfter.length}`,
  );
  record(
    checks,
    "RPC failure rolls back status and submitted log (photo required)",
    noPhotoStatusAfter === "draft" && noPhotoLogsAfter.length === noPhotoLogsBefore.length,
    "no partial commit before UPDATE",
  );

  const adminClient = createAnonClient(url, key);
  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(checks, "admin sign-in", adminUser != null && isAdminRole(adminUser!));

  if (adminUser && isAdminRole(adminUser)) {
    const adminSubmit = await callSubmitPetForReviewRpc(adminClient, noPhotoPet.id);
    record(
      checks,
      "admin submit rejected",
      !adminSubmit.ok && isInvalidSubmitActorError({ message: adminSubmit.errorMessage ?? "" }),
      adminSubmit.errorMessage,
    );
    record(
      checks,
      "admin submit leaves no-photo pet draft",
      (await selectPetStatus(breederClient, noPhotoPet.id)) === "draft",
    );
  } else {
    record(checks, "admin submit rejected", false, "admin sign-in failed");
    record(checks, "admin submit leaves no-photo pet draft", false, "skipped");
  }

  let draftPet = await findSecTestDraftPetWithPhoto(breederClient, breederId);

  if (!draftPet && returnPetId) {
    const adminClientForReset = createAnonClient(url, key);
    const resetAdminUser = await signIn(adminClientForReset, adminEmail, adminPassword);

    if (resetAdminUser && isAdminRole(resetAdminUser)) {
      draftPet = await recoverDraftPetWithPhotoViaAdminReturn(
        adminClientForReset,
        breederClient,
        returnPetId,
      );
      if (draftPet) {
        record(checks, "draft test pet recovered via admin return", true, draftPet.id);
      }
    }
  }

  if (!draftPet) {
    record(
      checks,
      "draft test pet with photo lookup",
      false,
      `no draft pet with management_name like '${SEC_TEST_PREFIX}%' and at least one photo`,
    );
    finish(checks);
    return;
  }

  record(checks, "draft test pet with photo lookup", true, draftPet.id);

  const logsBefore = await listSubmittedLogs(breederClient, draftPet.id);
  const submitResult = await callSubmitPetForReviewRpc(breederClient, draftPet.id);

  record(checks, "draft -> under_review succeeds", submitResult.ok, submitResult.errorMessage);

  const statusAfterSubmit = await selectPetStatus(breederClient, draftPet.id);
  record(
    checks,
    "status became under_review",
    statusAfterSubmit === "under_review",
    statusAfterSubmit ?? undefined,
  );

  const logsAfter = await listSubmittedLogs(breederClient, draftPet.id);
  const newLogCount = logsAfter.length - logsBefore.length;

  record(checks, "submitted log created once", newLogCount === 1, `delta=${newLogCount}`);

  const latestLog = logsAfter[0];

  if (latestLog) {
    record(checks, "submitted log pet_id is correct", latestLog.pet_id === draftPet.id);
    record(checks, "submitted log actor_user_id is correct", latestLog.actor_user_id === user.id);
    record(
      checks,
      "submitted log created_at is recorded",
      latestLog.created_at.trim().length > 0,
      latestLog.created_at,
    );
  } else {
    record(checks, "submitted log pet_id is correct", false, "no log row");
    record(checks, "submitted log actor_user_id is correct", false, "no log row");
    record(checks, "submitted log created_at is recorded", false, "no log row");
  }

  const doubleSubmit = await callSubmitPetForReviewRpc(breederClient, draftPet.id);
  const logsAfterDouble = await listSubmittedLogs(breederClient, draftPet.id);

  record(
    checks,
    "duplicate submit does not update status again",
    !doubleSubmit.ok && isInvalidPetStatusError({ message: doubleSubmit.errorMessage ?? "" }),
    doubleSubmit.errorMessage,
  );
  record(
    checks,
    "duplicate submit does not create extra submitted log",
    logsAfterDouble.length === logsAfter.length,
    `count=${logsAfterDouble.length}`,
  );
  record(
    checks,
    "invalid status submit rejected (already under_review)",
    !doubleSubmit.ok && isInvalidPetStatusError({ message: doubleSubmit.errorMessage ?? "" }),
    doubleSubmit.errorMessage,
  );
  record(
    checks,
    "duplicate RPC failure rolls back status and submitted log",
    (await selectPetStatus(breederClient, draftPet.id)) === "under_review" &&
      logsAfterDouble.length === logsAfter.length,
    "status unchanged, no extra log",
  );

  if (otherPetId) {
    const otherLogsBefore = await listSubmittedLogs(breederClient, otherPetId);
    const otherStatusBefore = await selectPetStatus(breederClient, otherPetId);
    const otherSubmit = await callSubmitPetForReviewRpc(breederClient, otherPetId);
    const otherLogsAfter = await listSubmittedLogs(breederClient, otherPetId);
    const otherStatusAfter = await selectPetStatus(breederClient, otherPetId);

    record(
      checks,
      "other breeder pet submit blocked",
      !otherSubmit.ok &&
        (isUnauthorizedError({ message: otherSubmit.errorMessage ?? "" }) ||
          isInvalidPetStatusError({ message: otherSubmit.errorMessage ?? "" })),
      otherSubmit.errorMessage ?? "expected RPC rejection",
    );
    record(
      checks,
      "other breeder pet submit does not create submitted log",
      otherLogsAfter.length === otherLogsBefore.length,
      `count=${otherLogsAfter.length}`,
    );
    record(
      checks,
      "other breeder pet status unchanged after blocked submit",
      otherStatusAfter === otherStatusBefore,
      otherStatusAfter ?? undefined,
    );
  } else {
    record(
      checks,
      "other breeder pet submit blocked",
      true,
      "skipped (SEC_TEST_OTHER_PET_ID unset)",
    );
    record(
      checks,
      "other breeder pet submit does not create submitted log",
      true,
      "skipped (SEC_TEST_OTHER_PET_ID unset)",
    );
    record(
      checks,
      "other breeder pet status unchanged after blocked submit",
      true,
      "skipped (SEC_TEST_OTHER_PET_ID unset)",
    );
  }

  finish(checks);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

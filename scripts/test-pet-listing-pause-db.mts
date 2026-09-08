/**
 * Pet listing pause / resume DB integration test (CASE A–S).
 *
 * Requires Migration:
 *   supabase/migrations/20260908100000_add_pet_listing_pause_resume.sql
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL / SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_ADMIN_EMAIL / SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_REVIEW_BREEDER_ID
 *
 * Optional:
 *   SEC_TEST_LISTING_PAUSE_PET_ID
 *   SEC_TEST_LISTING_PAUSE_DRAFT_PET_ID
 *   SEC_TEST_LISTING_PAUSE_UNDER_REVIEW_PET_ID
 *   SEC_TEST_OTHER_BREEDER_EMAIL / SEC_TEST_OTHER_BREEDER_PASSWORD
 *
 * Usage:
 *   npm run test:pet-listing-pause-db
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SEC_TEST_PREFIX = "[SEC-TEST]";
const MIN_LEN = 20;

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
  skipped?: boolean;
};

type PetRow = {
  id: string;
  management_name: string;
  status: string;
  description: string | null;
  pending_description: string | null;
  description_review_status: string;
  published_at: string | null;
  breeder_id: string;
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

function skip(checks: Check[], name: string, detail: string): void {
  checks.push({ name, passed: true, detail, skipped: true });
  console.log(`SKIP ${name} (${detail})`);
}

function finish(checks: Check[]): void {
  const executed = checks.filter((check) => !check.skipped);
  const passed = executed.filter((check) => check.passed).length;
  const failed = executed.length - passed;
  const skippedCount = checks.filter((check) => check.skipped).length;
  console.log("");
  console.log(`${passed} passed / ${failed} failed / ${skippedCount} skipped`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

function createAnonClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<User | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return null;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

function isAdminRole(user: User): boolean {
  return user.app_metadata?.role === "admin";
}

function rpcMessage(error: { message: string } | null): string {
  return error?.message ?? "";
}

function isRpcMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("could not find the function") || lower.includes("schema cache");
}

function isInvalidStatusError(error: { message: string } | null): boolean {
  return rpcMessage(error).toLowerCase().includes("invalid pet status");
}

function isUnauthorizedError(error: { message: string } | null): boolean {
  const lower = rpcMessage(error).toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("authentication required") ||
    lower.includes("invalid pause actor") ||
    lower.includes("invalid resume actor")
  );
}

function uniquePending(current: string): string {
  const base = "あ".repeat(MIN_LEN);
  const suffix = String(Date.now() % 1000).padStart(3, "0");
  const candidate = `${base}${suffix}`;
  if (candidate.trim() === current.trim()) {
    return `${base}001`;
  }
  return candidate;
}

async function loadPet(
  supabase: SupabaseClient,
  petId: string,
): Promise<{ pet: PetRow | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("pets")
    .select(
      "id, management_name, status, description, pending_description, description_review_status, published_at, breeder_id",
    )
    .eq("id", petId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { pet: null, errorMessage: error.message };
  }
  if (!data) {
    return { pet: null, errorMessage: "pet not found" };
  }
  if (!data.management_name.includes(SEC_TEST_PREFIX)) {
    return { pet: null, errorMessage: "not a [SEC-TEST] pet — aborting" };
  }
  return { pet: data as PetRow };
}

async function countRelatedRows(
  supabase: SupabaseClient,
  petId: string,
): Promise<{ inquiries: number; visits: number; favorites: number; errors: string[] }> {
  const errors: string[] = [];

  const { count: inquiryCount, error: inquiryError } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId);

  if (inquiryError) {
    errors.push(`inquiries: ${inquiryError.message}`);
  }

  const { data: inquiryIds, error: inquiryIdsError } = await supabase
    .from("inquiries")
    .select("id")
    .eq("pet_id", petId);

  if (inquiryIdsError) {
    errors.push(`inquiry ids: ${inquiryIdsError.message}`);
  }

  const ids = (inquiryIds ?? []).map((row) => row.id as string);
  let visitCount = 0;
  if (ids.length > 0) {
    const { count, error: visitError } = await supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .in("inquiry_id", ids);
    if (visitError) {
      errors.push(`visits: ${visitError.message}`);
    } else {
      visitCount = count ?? 0;
    }
  }

  const { count: favoriteCount, error: favoriteError } = await supabase
    .from("favorites")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId);

  if (favoriteError) {
    errors.push(`favorites: ${favoriteError.message}`);
  }

  return {
    inquiries: inquiryCount ?? 0,
    visits: visitCount,
    favorites: favoriteCount ?? 0,
    errors,
  };
}

async function isPetInPublicList(anonClient: SupabaseClient, petId: string): Promise<boolean> {
  const { data, error } = await anonClient
    .from("published_pets_public")
    .select("id")
    .eq("id", petId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return data != null;
}

async function isPetInPublicDetail(anonClient: SupabaseClient, petId: string): Promise<boolean> {
  const { data, error } = await anonClient
    .from("published_pet_detail_public")
    .select("id")
    .eq("id", petId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return data != null;
}

async function resolveDraftPetId(
  breederClient: SupabaseClient,
  breederId: string,
  excludePetId: string,
): Promise<string | null> {
  const configured =
    optionalEnv("SEC_TEST_LISTING_PAUSE_DRAFT_PET_ID") ??
    optionalEnv("SEC_TEST_SUBMIT_DRAFT_PET_ID");
  if (configured) {
    return configured;
  }

  const { data, error } = await breederClient
    .from("pets")
    .select("id, management_name, status")
    .eq("breeder_id", breederId)
    .eq("status", "draft")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return null;
  }

  for (const row of data ?? []) {
    if (row.id !== excludePetId) {
      return row.id as string;
    }
  }

  return null;
}

async function resolveUnderReviewPetId(
  breederClient: SupabaseClient,
  breederId: string,
  excludePetId: string,
): Promise<string | null> {
  const configured =
    optionalEnv("SEC_TEST_LISTING_PAUSE_UNDER_REVIEW_PET_ID") ??
    optionalEnv("SEC_TEST_ADMIN_REVIEW_PET_ID");
  if (configured) {
    return configured;
  }

  const { data, error } = await breederClient
    .from("pets")
    .select("id, management_name, status")
    .eq("breeder_id", breederId)
    .eq("status", "under_review")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return null;
  }

  for (const row of data ?? []) {
    if (row.id !== excludePetId) {
      return row.id as string;
    }
  }

  return null;
}

async function countDescriptionRevisionQueue(
  adminClient: SupabaseClient,
  petId: string,
): Promise<{ count: number; errorMessage?: string }> {
  const { count, error } = await adminClient
    .from("pets")
    .select("id", { count: "exact", head: true })
    .eq("id", petId)
    .eq("status", "published")
    .eq("description_review_status", "under_review");

  if (error) {
    return { count: -1, errorMessage: error.message };
  }

  return { count: count ?? 0 };
}

async function ensurePublished(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  petId: string,
): Promise<boolean> {
  const loaded = await loadPet(breederClient, petId);
  if (!loaded.pet) {
    return false;
  }

  if (loaded.pet.status === "published") {
    return true;
  }

  if (loaded.pet.status === "paused") {
    const { error } = await breederClient.rpc("resume_pet_listing", { p_pet_id: petId });
    return error == null;
  }

  if (loaded.pet.status === "under_review") {
    const { error } = await adminClient.rpc("approve_pet_for_publish", { p_pet_id: petId });
    return error == null;
  }

  return false;
}

async function probeMigration(supabase: SupabaseClient, checks: Check[]): Promise<boolean> {
  const { error: pauseError } = await supabase.rpc("pause_pet_listing", {
    p_pet_id: "00000000-0000-4000-8000-000000000001",
  });
  const pauseMissing = pauseError != null && isRpcMissing(pauseError.message);
  record(
    checks,
    "migration: pause_pet_listing exists",
    !pauseMissing,
    pauseMissing ? pauseError?.message : undefined,
  );

  const { error: resumeError } = await supabase.rpc("resume_pet_listing", {
    p_pet_id: "00000000-0000-4000-8000-000000000001",
  });
  const resumeMissing = resumeError != null && isRpcMissing(resumeError.message);
  record(
    checks,
    "migration: resume_pet_listing exists",
    !resumeMissing,
    resumeMissing ? resumeError?.message : undefined,
  );

  return !pauseMissing && !resumeMissing;
}

async function runInvalidStatusCases(
  breederClient: SupabaseClient,
  draftPetId: string | null,
  underReviewPetId: string | null,
  publishedPetId: string,
  checks: Check[],
): Promise<void> {
  if (draftPetId) {
    const { error } = await breederClient.rpc("pause_pet_listing", { p_pet_id: draftPetId });
    record(
      checks,
      "CASE C: draft → pause rejected",
      error != null && isInvalidStatusError(error),
      rpcMessage(error),
    );
  } else {
    skip(checks, "CASE C: draft → pause rejected", "no draft pet id");
  }

  if (underReviewPetId) {
    const { error } = await breederClient.rpc("pause_pet_listing", {
      p_pet_id: underReviewPetId,
    });
    record(
      checks,
      "CASE D: under_review → pause rejected",
      error != null && isInvalidStatusError(error),
      rpcMessage(error),
    );
  } else {
    skip(checks, "CASE D: under_review → pause rejected", "no under_review pet id");
  }

  const { error: resumeOnPublishedError } = await breederClient.rpc("resume_pet_listing", {
    p_pet_id: publishedPetId,
  });
  record(
    checks,
    "CASE E: published → resume rejected",
    resumeOnPublishedError != null && isInvalidStatusError(resumeOnPublishedError),
    rpcMessage(resumeOnPublishedError),
  );
}

async function runActorDeniedCases(
  otherBreederClient: SupabaseClient | null,
  breederClient: SupabaseClient,
  buyerClient: SupabaseClient | null,
  anonClient: SupabaseClient,
  petId: string,
  adminClient: SupabaseClient,
  checks: Check[],
): Promise<void> {
  if (otherBreederClient) {
    const { error: pauseError } = await otherBreederClient.rpc("pause_pet_listing", {
      p_pet_id: petId,
    });
    record(
      checks,
      "CASE F: other breeder pause denied",
      pauseError != null && isUnauthorizedError(pauseError),
      rpcMessage(pauseError),
    );

    await ensurePublished(breederClient, adminClient, petId);
    await breederClient.rpc("pause_pet_listing", { p_pet_id: petId });

    const { error: resumeError } = await otherBreederClient.rpc("resume_pet_listing", {
      p_pet_id: petId,
    });
    record(
      checks,
      "CASE G: other breeder resume denied",
      resumeError != null && isUnauthorizedError(resumeError),
      rpcMessage(resumeError),
    );

    await breederClient.rpc("resume_pet_listing", { p_pet_id: petId });
  } else {
    skip(checks, "CASE F: other breeder pause denied", "other breeder credentials unset");
    skip(checks, "CASE G: other breeder resume denied", "other breeder credentials unset");
  }

  if (buyerClient) {
    await ensurePublished(breederClient, adminClient, petId);

    const { error: pauseError } = await buyerClient.rpc("pause_pet_listing", { p_pet_id: petId });
    record(
      checks,
      "CASE H: buyer pause denied",
      pauseError != null && isUnauthorizedError(pauseError),
      rpcMessage(pauseError),
    );

    const { error: breederPauseError } = await breederClient.rpc("pause_pet_listing", {
      p_pet_id: petId,
    });
    record(
      checks,
      "CASE H setup: breeder pauses pet for resume auth test",
      breederPauseError == null,
      rpcMessage(breederPauseError),
    );

    const pausedForBuyer = await loadPet(breederClient, petId);
    record(
      checks,
      "CASE H setup: pet is paused before buyer resume",
      pausedForBuyer.pet?.status === "paused",
      pausedForBuyer.pet?.status,
    );

    const { error: resumeError } = await buyerClient.rpc("resume_pet_listing", { p_pet_id: petId });
    record(
      checks,
      "CASE H: buyer resume denied",
      resumeError != null && isUnauthorizedError(resumeError),
      rpcMessage(resumeError),
    );

    const { error: breederResumeError } = await breederClient.rpc("resume_pet_listing", {
      p_pet_id: petId,
    });
    record(
      checks,
      "CASE H cleanup: breeder resumes pet",
      breederResumeError == null,
      rpcMessage(breederResumeError),
    );
  } else {
    skip(checks, "CASE H: buyer pause denied", "SEC_TEST_BUYER unset");
    skip(checks, "CASE H: buyer resume denied", "SEC_TEST_BUYER unset");
  }

  const { error: anonPauseError } = await anonClient.rpc("pause_pet_listing", { p_pet_id: petId });
  record(checks, "CASE I: anon pause denied", anonPauseError != null, rpcMessage(anonPauseError));

  const { error: anonResumeError } = await anonClient.rpc("resume_pet_listing", {
    p_pet_id: petId,
  });
  record(
    checks,
    "CASE I: anon resume denied",
    anonResumeError != null,
    rpcMessage(anonResumeError),
  );
}

async function runDescriptionRevisionPause(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const before = await loadPet(breederClient, petId);
  if (!before.pet || before.pet.status !== "published") {
    skip(checks, "CASE L: revision pause clears pending", "pet not published");
    skip(checks, "CASE M: description preserved", "pet not published");
    skip(checks, "CASE N: published_at preserved", "pet not published");
    return;
  }

  const originalDescription = before.pet.description;
  const originalPublishedAt = before.pet.published_at;
  const pending = uniquePending(before.pet.description ?? "");

  await breederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: pending,
  });
  const { error: submitError } = await breederClient.rpc("submit_pet_description_revision", {
    p_pet_id: petId,
  });

  if (submitError) {
    skip(checks, "CASE L: revision pause clears pending", submitError.message);
    skip(checks, "CASE M: description preserved", submitError.message);
    skip(checks, "CASE N: published_at preserved", submitError.message);
    return;
  }

  const underReview = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE L setup: under_review revision",
    underReview.pet?.description_review_status === "under_review",
    underReview.pet?.description_review_status,
  );

  const queueBefore = await countDescriptionRevisionQueue(adminClient, petId);
  record(
    checks,
    "CASE L setup: pet in description revision queue",
    queueBefore.errorMessage == null && queueBefore.count === 1,
    queueBefore.errorMessage ?? `count=${queueBefore.count}`,
  );

  const { error: pauseError } = await breederClient.rpc("pause_pet_listing", { p_pet_id: petId });
  record(
    checks,
    "CASE L: pause during revision succeeds",
    pauseError == null,
    rpcMessage(pauseError),
  );

  const paused = await loadPet(breederClient, petId);
  record(checks, "CASE L: status paused", paused.pet?.status === "paused", paused.pet?.status);
  record(
    checks,
    "CASE L: pending_description cleared",
    paused.pet?.pending_description == null,
    paused.pet?.pending_description ?? "null",
  );
  record(
    checks,
    "CASE L: description_review_status none",
    paused.pet?.description_review_status === "none",
    paused.pet?.description_review_status,
  );
  record(
    checks,
    "CASE M: description unchanged on pause",
    paused.pet?.description === originalDescription,
  );
  record(
    checks,
    "CASE N: published_at unchanged on pause",
    paused.pet?.published_at === originalPublishedAt,
  );

  const queueAfterPause = await countDescriptionRevisionQueue(adminClient, petId);
  record(
    checks,
    "CASE L: removed from description revision queue on pause",
    queueAfterPause.errorMessage == null && queueAfterPause.count === 0,
    queueAfterPause.errorMessage ?? `count=${queueAfterPause.count}`,
  );

  const { error: resumeError } = await breederClient.rpc("resume_pet_listing", { p_pet_id: petId });
  record(checks, "CASE L resume: succeeds", resumeError == null, rpcMessage(resumeError));

  const resumed = await loadPet(breederClient, petId);
  record(checks, "CASE L resume: status published", resumed.pet?.status === "published");
  record(
    checks,
    "CASE L resume: description still original",
    resumed.pet?.description === originalDescription,
  );

  const queueAfterResume = await countDescriptionRevisionQueue(adminClient, petId);
  record(
    checks,
    "CASE L: remains absent from description revision queue after resume",
    queueAfterResume.errorMessage == null && queueAfterResume.count === 0,
    queueAfterResume.errorMessage ?? `count=${queueAfterResume.count}`,
  );
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;
  let publishableKey: string;
  let breederEmail: string;
  let breederPassword: string;
  let adminEmail: string;
  let adminPassword: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
    breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
    adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
    adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
    requireEnv("SEC_TEST_REVIEW_BREEDER_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    console.log(`FAIL environment (${message})`);
    process.exitCode = 1;
    return;
  }

  const breederClient = createAnonClient(supabaseUrl, publishableKey);
  const adminClient = createAnonClient(supabaseUrl, publishableKey);
  const anonClient = createAnonClient(supabaseUrl, publishableKey);

  const breederUser = await signIn(breederClient, breederEmail, breederPassword);
  record(checks, "breeder authentication", breederUser != null);
  if (!breederUser || isAdminRole(breederUser)) {
    finish(checks);
    return;
  }

  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(checks, "admin authentication", adminUser != null && isAdminRole(adminUser));
  if (!adminUser || !isAdminRole(adminUser)) {
    finish(checks);
    return;
  }

  const migrationOk = await probeMigration(breederClient, checks);
  if (!migrationOk) {
    finish(checks);
    return;
  }

  let petId =
    optionalEnv("SEC_TEST_LISTING_PAUSE_PET_ID") ?? optionalEnv("SEC_TEST_PUBLIC_PUBLISHED_PET_ID");
  if (!petId) {
    const { data: publishedPets } = await breederClient
      .from("pets")
      .select("id, management_name, status, description")
      .eq("status", "published")
      .like("management_name", `${SEC_TEST_PREFIX}%`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    for (const row of publishedPets ?? []) {
      if ((row.description ?? "").trim().length >= MIN_LEN) {
        petId = row.id as string;
        break;
      }
    }
    petId = petId ?? publishedPets?.[0]?.id ?? null;
  }

  if (!petId) {
    record(checks, "resolve pause test pet", false, "no published [SEC-TEST] pet");
    finish(checks);
    return;
  }
  record(checks, "resolve pause test pet", true, petId);

  const breederId = requireEnv("SEC_TEST_REVIEW_BREEDER_ID");

  const restored = await ensurePublished(breederClient, adminClient, petId);
  record(checks, "ensure pet published before tests", restored);
  if (!restored) {
    finish(checks);
    return;
  }

  const beforeCounts = await countRelatedRows(breederClient, petId);
  if (beforeCounts.errors.length > 0) {
    skip(checks, "CASE O/P/Q setup", beforeCounts.errors.join("; "));
  }

  const beforePet = await loadPet(breederClient, petId);
  const originalDescription = beforePet.pet?.description ?? null;
  const originalPublishedAt = beforePet.pet?.published_at ?? null;

  const { error: pauseError } = await breederClient.rpc("pause_pet_listing", { p_pet_id: petId });
  record(checks, "CASE A: published → paused", pauseError == null, rpcMessage(pauseError));

  const pausedPet = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE A: status is paused",
    pausedPet.pet?.status === "paused",
    pausedPet.pet?.status,
  );
  record(
    checks,
    "CASE M: description preserved on simple pause",
    pausedPet.pet?.description === originalDescription,
  );
  record(
    checks,
    "CASE N: published_at preserved on simple pause",
    pausedPet.pet?.published_at === originalPublishedAt,
  );

  const pausedPublicList = await isPetInPublicList(anonClient, petId);
  const pausedPublicDetail = await isPetInPublicDetail(anonClient, petId);
  record(checks, "CASE R: paused hidden from published_pets_public", !pausedPublicList);
  record(checks, "CASE R: paused hidden from published_pet_detail_public", !pausedPublicDetail);

  const afterPauseCounts = await countRelatedRows(breederClient, petId);
  record(
    checks,
    "CASE O: inquiries preserved on pause",
    afterPauseCounts.inquiries === beforeCounts.inquiries,
    `${beforeCounts.inquiries} → ${afterPauseCounts.inquiries}`,
  );
  record(
    checks,
    "CASE P: visits preserved on pause",
    afterPauseCounts.visits === beforeCounts.visits,
    `${beforeCounts.visits} → ${afterPauseCounts.visits}`,
  );
  record(
    checks,
    "CASE Q: favorites preserved on pause",
    afterPauseCounts.favorites === beforeCounts.favorites,
    `${beforeCounts.favorites} → ${afterPauseCounts.favorites}`,
  );

  const { error: doublePauseError } = await breederClient.rpc("pause_pet_listing", {
    p_pet_id: petId,
  });
  record(
    checks,
    "CASE J: double pause rejected",
    doublePauseError != null && isInvalidStatusError(doublePauseError),
    rpcMessage(doublePauseError),
  );

  const { error: resumeError } = await breederClient.rpc("resume_pet_listing", { p_pet_id: petId });
  record(checks, "CASE B: paused → published", resumeError == null, rpcMessage(resumeError));

  const resumedPet = await loadPet(breederClient, petId);
  record(checks, "CASE B: status is published", resumedPet.pet?.status === "published");

  const resumedPublicList = await isPetInPublicList(anonClient, petId);
  const resumedPublicDetail = await isPetInPublicDetail(anonClient, petId);
  record(checks, "CASE S: resume visible in published_pets_public", resumedPublicList);
  record(checks, "CASE S: resume visible in published_pet_detail_public", resumedPublicDetail);

  const { error: doubleResumeError } = await breederClient.rpc("resume_pet_listing", {
    p_pet_id: petId,
  });
  record(
    checks,
    "CASE K: double resume rejected",
    doubleResumeError != null && isInvalidStatusError(doubleResumeError),
    rpcMessage(doubleResumeError),
  );

  const draftPetId = await resolveDraftPetId(breederClient, breederId, petId);
  const underReviewPetId = await resolveUnderReviewPetId(breederClient, breederId, petId);
  await runInvalidStatusCases(breederClient, draftPetId, underReviewPetId, petId, checks);

  let otherBreederClient: SupabaseClient | null = null;
  const otherBreederEmail = optionalEnv("SEC_TEST_OTHER_BREEDER_EMAIL");
  const otherBreederPassword = optionalEnv("SEC_TEST_OTHER_BREEDER_PASSWORD");
  if (otherBreederEmail && otherBreederPassword) {
    otherBreederClient = createAnonClient(supabaseUrl, publishableKey);
    const otherUser = await signIn(otherBreederClient, otherBreederEmail, otherBreederPassword);
    if (!otherUser || isAdminRole(otherUser)) {
      otherBreederClient = null;
    }
  }

  let buyerClient: SupabaseClient | null = null;
  const buyerEmail = optionalEnv("SEC_TEST_BUYER_EMAIL");
  const buyerPassword = optionalEnv("SEC_TEST_BUYER_PASSWORD");
  if (buyerEmail && buyerPassword) {
    buyerClient = createAnonClient(supabaseUrl, publishableKey);
    const buyerUser = await signIn(buyerClient, buyerEmail, buyerPassword);
    if (!buyerUser) {
      buyerClient = null;
    }
  }

  await runActorDeniedCases(
    otherBreederClient,
    breederClient,
    buyerClient,
    anonClient,
    petId,
    adminClient,
    checks,
  );

  await runDescriptionRevisionPause(breederClient, adminClient, petId, checks);

  await ensurePublished(breederClient, adminClient, petId);

  finish(checks);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  process.exitCode = 1;
});

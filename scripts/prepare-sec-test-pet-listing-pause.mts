/**
 * SEC-TEST preparation for pet listing pause / resume DB integration test.
 *
 * Ensures a published [SEC-TEST] pet for pause/resume cycles.
 * Resumes paused canonical pet when pause/resume RPCs are available.
 *
 * NOT production code. Dev/test only.
 *
 * Requires Migration:
 *   supabase/migrations/20260908100000_add_pet_listing_pause_resume.sql
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
 * Usage:
 *   npm run prepare:sec-test-pet-listing-pause
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SEC_TEST_PREFIX = "[SEC-TEST]";
const PAUSE_PET_NAME = "[SEC-TEST] Listing Pause Resume Pet";
const UNDER_REVIEW_PET_NAME = "[SEC-TEST] Listing Pause Under Review Pet";
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_PET_SLOTS = 30;

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type PetRow = {
  id: string;
  management_name: string;
  status: string;
  description: string | null;
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

function createClientAnon(url: string, key: string): SupabaseClient {
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

function isRpcMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("could not find the function") || lower.includes("schema cache");
}

function buildPetName(slot: number): string {
  if (slot <= 1) {
    return PAUSE_PET_NAME;
  }
  return `${PAUSE_PET_NAME} #${slot}`;
}

async function findCanonicalPet(
  supabase: SupabaseClient,
  breederId: string,
): Promise<PetRow | null> {
  for (let slot = 1; slot <= MAX_PET_SLOTS; slot += 1) {
    const name = buildPetName(slot);
    const { data, error } = await supabase
      .from("pets")
      .select("id, management_name, status, description")
      .eq("breeder_id", breederId)
      .eq("management_name", name)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as PetRow;
    }
  }

  return null;
}

async function findAnyPublishedSecTestPet(
  supabase: SupabaseClient,
  breederId: string,
): Promise<PetRow | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status, description")
    .eq("breeder_id", breederId)
    .eq("status", "published")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if ((row.description ?? "").trim().length >= MIN_DESCRIPTION_LENGTH) {
      return row as PetRow;
    }
  }

  return null;
}

async function findDraftSecTestPet(
  supabase: SupabaseClient,
  breederId: string,
  excludePetId: string | null,
): Promise<PetRow | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status, description")
    .eq("breeder_id", breederId)
    .eq("status", "draft")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if (excludePetId && row.id === excludePetId) {
      continue;
    }
    return row as PetRow;
  }

  return null;
}

async function findUnderReviewSecTestPet(
  supabase: SupabaseClient,
  breederId: string,
  excludePetId: string | null,
): Promise<PetRow | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status, description")
    .eq("breeder_id", breederId)
    .eq("status", "under_review")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if (excludePetId && row.id === excludePetId) {
      continue;
    }
    return row as PetRow;
  }

  return null;
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

async function ensureUnderReviewPet(
  breederClient: SupabaseClient,
  breederId: string,
  excludePetId: string,
  checks: Check[],
): Promise<PetRow | null> {
  const existing = await findUnderReviewSecTestPet(breederClient, breederId, excludePetId);
  if (existing) {
    record(checks, "prepare under_review pet", true, `reused ${existing.management_name}`);
    return existing;
  }

  const { data: dedicatedDraft, error: dedicatedError } = await breederClient
    .from("pets")
    .select("id, management_name, status, description")
    .eq("breeder_id", breederId)
    .eq("management_name", UNDER_REVIEW_PET_NAME)
    .eq("status", "draft")
    .is("deleted_at", null)
    .maybeSingle();

  if (dedicatedError) {
    record(checks, "prepare under_review pet", false, dedicatedError.message);
    return null;
  }

  let draftPet = dedicatedDraft as PetRow | null;
  if (!draftPet) {
    draftPet = await findDraftSecTestPet(breederClient, breederId, excludePetId);
  }

  if (!draftPet) {
    record(checks, "prepare under_review pet", false, "no draft [SEC-TEST] pet available");
    return null;
  }

  const photoCount = await countPetPhotos(breederClient, draftPet.id);
  if (photoCount < 1) {
    record(
      checks,
      "prepare under_review pet",
      false,
      `${draftPet.management_name} has no photo for submit`,
    );
    return null;
  }

  const { error: submitError } = await breederClient.rpc("submit_pet_for_review", {
    p_pet_id: draftPet.id,
  });
  if (submitError) {
    record(checks, "prepare under_review pet", false, submitError.message);
    return null;
  }

  const { data: submitted, error: reloadError } = await breederClient
    .from("pets")
    .select("id, management_name, status, description")
    .eq("id", draftPet.id)
    .maybeSingle();

  const ok = reloadError == null && submitted?.status === "under_review";
  record(
    checks,
    "prepare under_review pet",
    ok,
    ok ? submitted?.management_name : (reloadError?.message ?? submitted?.status),
  );

  return ok ? (submitted as PetRow) : null;
}

async function ensurePublishedViaAdmin(
  adminClient: SupabaseClient,
  breederClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<boolean> {
  const { data: pet, error } = await breederClient
    .from("pets")
    .select("id, status, management_name")
    .eq("id", petId)
    .maybeSingle();

  if (error || !pet) {
    record(checks, "resolve pet for publish", false, error?.message ?? "not found");
    return false;
  }

  if (pet.status === "published") {
    record(checks, "ensure published", true, "already published");
    return true;
  }

  if (pet.status === "paused") {
    const { error: resumeError } = await breederClient.rpc("resume_pet_listing", {
      p_pet_id: petId,
    });
    record(checks, "ensure published (resume paused)", resumeError == null, resumeError?.message);
    return resumeError == null;
  }

  if (pet.status === "draft") {
    const { error: submitError } = await breederClient.rpc("submit_pet_for_review", {
      p_pet_id: petId,
    });
    if (submitError) {
      record(checks, "submit for review before publish", false, submitError.message);
      return false;
    }
  }

  const { data: afterSubmit } = await breederClient
    .from("pets")
    .select("status")
    .eq("id", petId)
    .maybeSingle();

  if (afterSubmit?.status === "under_review") {
    const { error: approveError } = await adminClient.rpc("approve_pet_for_publish", {
      p_pet_id: petId,
    });
    record(checks, "admin approve for publish", approveError == null, approveError?.message);
    return approveError == null;
  }

  record(
    checks,
    "ensure published",
    false,
    `unexpected status=${afterSubmit?.status ?? pet.status}`,
  );
  return false;
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

  const breederClient = createClientAnon(supabaseUrl, publishableKey);
  const adminClient = createClientAnon(supabaseUrl, publishableKey);

  const breederUser = await signIn(breederClient, breederEmail, breederPassword);
  record(checks, "breeder authentication", breederUser != null);
  if (!breederUser || isAdminRole(breederUser)) {
    process.exitCode = 1;
    return;
  }

  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(
    checks,
    "admin authentication",
    adminUser != null && adminUser != null && isAdminRole(adminUser),
  );
  if (!adminUser || !isAdminRole(adminUser)) {
    process.exitCode = 1;
    return;
  }

  const { data: breederRow, error: breederError } = await breederClient
    .from("breeders")
    .select("id")
    .eq("user_id", breederUser.id)
    .maybeSingle();

  if (breederError || !breederRow) {
    record(checks, "breeder id lookup", false, breederError?.message ?? "missing");
    process.exitCode = 1;
    return;
  }
  record(checks, "breeder id lookup", true, breederRow.id);

  const { error: probeError } = await breederClient.rpc("pause_pet_listing", {
    p_pet_id: "00000000-0000-4000-8000-000000000001",
  });
  const migrationApplied = probeError == null || !isRpcMissing(probeError.message);
  record(
    checks,
    "pause/resume migration applied",
    migrationApplied,
    migrationApplied ? undefined : probeError?.message,
  );
  if (!migrationApplied) {
    process.exitCode = 1;
    return;
  }

  let pet = await findCanonicalPet(breederClient, breederRow.id);
  if (!pet) {
    pet = await findAnyPublishedSecTestPet(breederClient, breederRow.id);
    if (pet) {
      record(checks, "canonical pause pet", true, `fallback to ${pet.management_name}`);
    }
  } else {
    record(checks, "canonical pause pet", true, pet.management_name);
  }

  if (!pet) {
    record(
      checks,
      "published sec-test pet",
      false,
      "no suitable pet found — run prepare:sec-test-description-revision first",
    );
    process.exitCode = 1;
    return;
  }

  const publishedOk = await ensurePublishedViaAdmin(adminClient, breederClient, pet.id, checks);
  if (!publishedOk) {
    process.exitCode = 1;
    return;
  }

  const { data: finalPet, error: finalPetError } = await breederClient
    .from("pets")
    .select("description")
    .eq("id", pet.id)
    .maybeSingle();

  const descriptionLength = (finalPet?.description ?? "").trim().length;
  record(
    checks,
    "published pet description usable",
    finalPetError == null && descriptionLength >= MIN_DESCRIPTION_LENGTH,
    finalPetError?.message ?? `length=${descriptionLength}`,
  );
  if (finalPetError || descriptionLength < MIN_DESCRIPTION_LENGTH) {
    process.exitCode = 1;
    return;
  }

  const draftPet = await findDraftSecTestPet(breederClient, breederRow.id, pet.id);
  if (draftPet) {
    record(checks, "prepare draft pet for CASE C", true, draftPet.management_name);
  } else {
    record(checks, "prepare draft pet for CASE C", false, "no draft [SEC-TEST] pet found");
  }

  const underReviewPet = await ensureUnderReviewPet(breederClient, breederRow.id, pet.id, checks);

  console.log("");
  console.log("Preparation completed");
  console.log("");
  console.log(`SEC_TEST_LISTING_PAUSE_PET_ID=${pet.id}`);
  if (draftPet) {
    console.log(`SEC_TEST_LISTING_PAUSE_DRAFT_PET_ID=${draftPet.id}`);
  }
  if (underReviewPet) {
    console.log(`SEC_TEST_LISTING_PAUSE_UNDER_REVIEW_PET_ID=${underReviewPet.id}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  process.exitCode = 1;
});

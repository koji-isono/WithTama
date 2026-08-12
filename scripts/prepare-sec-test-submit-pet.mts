/**
 * SEC-TEST pet preparation for submit_pet_for_review security test.
 *
 * Ensures at least one draft [SEC-TEST] Submit RPC With Photo Pet (or numbered
 * variant) owned by SEC_TEST_BREEDER with at least one pet_photos row.
 *
 * Published or under_review canonical pets are left untouched; a fresh numbered
 * variant is created instead. Does NOT rewind published pets to draft.
 *
 * NOT production code. Dev/test only.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   npm run prepare:sec-test-submit-pet
 */

import { randomUUID } from "node:crypto";

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SUBMIT_PHOTO_PET_NAME = "[SEC-TEST] Submit RPC With Photo Pet";
const SUBMIT_PHOTO_PET_NAME_PREFIX = "[SEC-TEST] Submit RPC With Photo Pet";
const NO_PHOTO_PET_NAME = "[SEC-TEST] Submit RPC No Photo Pet";
const PROTECTED_PET_NAME = "[SEC-TEST] Trigger Test Pet";
const PET_PHOTOS_BUCKET = "pet-photos";
const MAX_SUBMIT_PHOTO_PET_SLOTS = 50;

/** Minimal valid 1x1 JPEG for Storage upload (well under 10MB limit). */
const MINIMAL_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type PetRow = {
  id: string;
  management_name: string;
  status: string;
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

function buildSubmitPhotoPetManagementName(slotIndex: number): string {
  if (slotIndex <= 1) {
    return SUBMIT_PHOTO_PET_NAME;
  }

  return `${SUBMIT_PHOTO_PET_NAME_PREFIX} #${slotIndex}`;
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

async function findPetByName(
  supabase: SupabaseClient,
  breederId: string,
  managementName: string,
): Promise<{ pet: PetRow | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, management_name, status")
    .eq("breeder_id", breederId)
    .eq("management_name", managementName)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { pet: null, errorMessage: error.message };
  }

  return { pet: data as PetRow | null };
}

async function findReusableDraftSubmitPetWithPhoto(
  supabase: SupabaseClient,
  breederId: string,
): Promise<PetRow | null> {
  const { data: pets, error } = await supabase
    .from("pets")
    .select("id, management_name, status")
    .eq("breeder_id", breederId)
    .like("management_name", `${SUBMIT_PHOTO_PET_NAME_PREFIX}%`)
    .eq("status", "draft")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const pet of pets ?? []) {
    const photoCount = await countPetPhotos(supabase, pet.id);
    if (photoCount >= 1) {
      return pet as PetRow;
    }
  }

  return null;
}

async function uploadFixturePhoto(
  supabase: SupabaseClient,
  userId: string,
  petId: string,
): Promise<{ storagePath: string | null; errorMessage?: string }> {
  const fileName = `${randomUUID()}.jpg`;
  const storagePath = `breeders/${userId}/pets/${petId}/${fileName}`;
  const body = Buffer.from(MINIMAL_JPEG_BASE64, "base64");

  const { error: uploadError } = await supabase.storage
    .from(PET_PHOTOS_BUCKET)
    .upload(storagePath, body, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return { storagePath: null, errorMessage: uploadError.message };
  }

  const { error: insertError } = await supabase.from("pet_photos").insert({
    pet_id: petId,
    storage_path: storagePath,
    display_order: 0,
    is_main: true,
    alt_text: "[SEC-TEST] fixture photo",
  });

  if (insertError) {
    await supabase.storage.from(PET_PHOTOS_BUCKET).remove([storagePath]);
    return { storagePath: null, errorMessage: insertError.message };
  }

  return { storagePath };
}

async function ensureDraftPetHasPhoto(
  supabase: SupabaseClient,
  userId: string,
  petId: string,
  checks: Check[],
  label: string,
): Promise<boolean> {
  const photoCount = await countPetPhotos(supabase, petId);

  if (photoCount >= 1) {
    record(checks, label, true, `already has ${photoCount} photo(s)`);
    return true;
  }

  const uploaded = await uploadFixturePhoto(supabase, userId, petId);
  record(
    checks,
    label,
    uploaded.storagePath != null,
    uploaded.errorMessage ?? uploaded.storagePath ?? undefined,
  );

  return uploaded.storagePath != null;
}

async function ensureDraftSubmitPetWithPhoto(
  supabase: SupabaseClient,
  breederId: string,
  userId: string,
  checks: Check[],
): Promise<string | null> {
  const reusable = await findReusableDraftSubmitPetWithPhoto(supabase, breederId);

  if (reusable) {
    record(
      checks,
      "prepare submit photo pet",
      true,
      `reused draft pet with photo (${reusable.management_name})`,
    );
    return reusable.id;
  }

  for (let slotIndex = 1; slotIndex <= MAX_SUBMIT_PHOTO_PET_SLOTS; slotIndex += 1) {
    const managementName = buildSubmitPhotoPetManagementName(slotIndex);

    if (
      managementName === NO_PHOTO_PET_NAME ||
      managementName === PROTECTED_PET_NAME ||
      managementName.startsWith("[SEC-TEST] Review RPC")
    ) {
      continue;
    }

    const { pet: existing, errorMessage: findError } = await findPetByName(
      supabase,
      breederId,
      managementName,
    );

    if (findError) {
      record(checks, "prepare submit photo pet", false, findError);
      return null;
    }

    if (!existing) {
      const { data: inserted, error: insertError } = await supabase
        .from("pets")
        .insert(buildDraftInsertPayload(breederId, managementName, userId))
        .select("id, management_name, status")
        .single();

      if (insertError || !inserted) {
        record(checks, "prepare submit photo pet", false, insertError?.message ?? "insert failed");
        return null;
      }

      const photoOk = await ensureDraftPetHasPhoto(
        supabase,
        userId,
        inserted.id as string,
        checks,
        "upload fixture photo",
      );

      if (!photoOk) {
        return null;
      }

      record(
        checks,
        "prepare submit photo pet",
        true,
        `created fresh draft pet (${managementName})`,
      );
      return inserted.id as string;
    }

    if (existing.status === "draft") {
      const photoOk = await ensureDraftPetHasPhoto(
        supabase,
        userId,
        existing.id,
        checks,
        "upload fixture photo",
      );

      if (!photoOk) {
        return null;
      }

      record(checks, "prepare submit photo pet", true, `reused draft pet (${managementName})`);
      return existing.id;
    }

    if (existing.status === "published" || existing.status === "under_review") {
      continue;
    }

    continue;
  }

  record(
    checks,
    "prepare submit photo pet",
    false,
    `could not allocate draft submit pet within ${MAX_SUBMIT_PHOTO_PET_SLOTS} slots`,
  );
  return null;
}

async function verifyFinalPetState(
  supabase: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<boolean> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, status, management_name")
    .eq("id", petId)
    .is("deleted_at", null)
    .maybeSingle();

  const photoCount = data ? await countPetPhotos(supabase, petId) : 0;
  const ok = data != null && data.status === "draft" && photoCount >= 1 && error == null;

  record(
    checks,
    "final submit pet state",
    ok,
    error?.message ??
      (ok
        ? `${data.management_name}, photos=${photoCount}`
        : `expected draft with photo, got status=${data?.status ?? "missing"}, photos=${photoCount}`),
  );

  return ok;
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

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;
  let publishableKey: string;
  let breederEmail: string;
  let breederPassword: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
    breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
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

  if (userError || !user) {
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
      "admin+breeder account cannot prepare submit test pets reliably",
    );
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }
  record(checks, "breeder non-admin account", true);

  const breederId = await loadBreederId(supabase, user.id);

  if (!breederId) {
    record(checks, "breeder id lookup", false, "no breeders row");
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }
  record(checks, "breeder id lookup", true, breederId);

  const petId = await ensureDraftSubmitPetWithPhoto(supabase, breederId, user.id, checks);

  if (!petId) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const finalOk = await verifyFinalPetState(supabase, petId, checks);

  if (!finalOk) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Preparation completed");
  console.log("");
  console.log(`SEC_TEST_SUBMIT_DRAFT_PET_ID=${petId}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  console.log("");
  console.log("Preparation aborted");
  process.exitCode = 1;
});

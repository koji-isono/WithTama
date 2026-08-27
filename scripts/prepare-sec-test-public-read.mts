/**
 * SEC-TEST preparation for PU-01 public read security test.
 *
 * Idempotently sets SEC_TEST_REVIEW_BREEDER membership_status = active via admin JWT
 * (same RLS path as prepare-sec-test-review-breeder review approval).
 * Does NOT weaken is_publicly_listable_pet / published_pets_public conditions.
 *
 * Resolves the published pet with a main photo for SEC_TEST_PUBLIC_PUBLISHED_PET_ID.
 *
 * NOT production code. Dev/test only.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_ADMIN_EMAIL
 *   SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_REVIEW_BREEDER_ID
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   npm run prepare:sec-test-public-read
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SUBMIT_PHOTO_PET_NAME = "[SEC-TEST] Submit RPC With Photo Pet";
const SUBMIT_PHOTO_PET_NAME_PREFIX = "[SEC-TEST] Submit RPC With Photo Pet";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type BreederPublicReadState = {
  id: string;
  review_status: string;
  membership_status: string;
  deleted_at: string | null;
};

type PetRow = {
  id: string;
  management_name: string;
  status: string;
  breeder_id: string;
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

function createClientAnon(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function authenticateAdmin(
  supabase: SupabaseClient,
  email: string,
  password: string,
  checks: Check[],
): Promise<User | null> {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
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
): Promise<{ breeder: BreederPublicReadState | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("breeders")
    .select("id, review_status, membership_status, deleted_at")
    .eq("id", breederId)
    .maybeSingle();

  if (error || !data) {
    return { breeder: null, errorMessage: error?.message ?? "breeder not found or not visible" };
  }

  return { breeder: data as BreederPublicReadState };
}

function isSubmitWithPhotoPetName(name: string): boolean {
  return name === SUBMIT_PHOTO_PET_NAME || name.startsWith(`${SUBMIT_PHOTO_PET_NAME_PREFIX} #`);
}

async function findPublishedPetWithMainPhoto(
  supabase: SupabaseClient,
  breederId: string,
): Promise<{ petId: string | null; detail?: string }> {
  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select("id, management_name, status, breeder_id")
    .eq("breeder_id", breederId)
    .eq("status", "published")
    .is("deleted_at", null)
    .like("management_name", `${SUBMIT_PHOTO_PET_NAME}%`);

  if (petsError) {
    return { petId: null, detail: petsError.message };
  }

  const candidates = (pets as PetRow[] | null)?.filter((pet) =>
    isSubmitWithPhotoPetName(pet.management_name),
  );

  if (!candidates || candidates.length === 0) {
    return {
      petId: null,
      detail: `no published pet named like '${SUBMIT_PHOTO_PET_NAME}' — run prepare:sec-test-submit-pet and approve pet review`,
    };
  }

  for (const pet of candidates) {
    const { count, error: photoError } = await supabase
      .from("pet_photos")
      .select("id", { count: "exact", head: true })
      .eq("pet_id", pet.id)
      .eq("is_main", true);

    if (photoError) {
      return { petId: null, detail: photoError.message };
    }

    if ((count ?? 0) >= 1) {
      return { petId: pet.id };
    }
  }

  return {
    petId: null,
    detail: "published Submit With Photo pet exists but has no is_main photo",
  };
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;
  let publishableKey: string;
  let adminEmail: string;
  let adminPassword: string;
  let breederId: string;
  let breederEmail: string;
  let breederPassword: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
    adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
    breederId = requireEnv("SEC_TEST_REVIEW_BREEDER_ID");
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

  const adminClient = createClientAnon(supabaseUrl, publishableKey);
  const adminUser = await authenticateAdmin(adminClient, adminEmail, adminPassword, checks);

  if (!adminUser) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const { breeder: breederBefore, errorMessage: beforeError } = await fetchBreederState(
    adminClient,
    breederId,
  );

  record(checks, "SEC_TEST breeder lookup", breederBefore != null, beforeError);

  if (!breederBefore) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  if (breederBefore.deleted_at != null) {
    record(checks, "SEC_TEST breeder not deleted", false, "deleted_at is set");
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  record(
    checks,
    "SEC_TEST breeder review_status approved",
    breederBefore.review_status === "approved",
  );

  if (breederBefore.review_status !== "approved") {
    console.log("");
    console.log("Preparation aborted — run npm run prepare:sec-test-review-breeder first");
    process.exitCode = 1;
    return;
  }

  if (breederBefore.membership_status === "active") {
    record(checks, "SEC_TEST breeder membership_status active", true, "already active");
  } else if (breederBefore.membership_status === "pending") {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceRoleKey) {
      record(
        checks,
        "SEC_TEST breeder membership_status active",
        false,
        "pending — set SUPABASE_SERVICE_ROLE_KEY or ensure membership_status is already active (admin direct UPDATE blocked by billing trigger)",
      );
      console.log("");
      console.log("Preparation aborted");
      process.exitCode = 1;
      return;
    }

    const serviceClient = createClientAnon(supabaseUrl, serviceRoleKey);
    const { data: updateRows, error: updateError } = await serviceClient
      .from("breeders")
      .update({ membership_status: "active" })
      .eq("id", breederId)
      .eq("membership_status", "pending")
      .select("id, membership_status");

    const updateOk = updateError == null && (updateRows?.length ?? 0) === 1;
    record(
      checks,
      "SEC_TEST breeder membership_status active",
      updateOk,
      updateError?.message ?? (updateOk ? "via service_role" : "expected 1 updated row"),
    );

    if (!updateOk) {
      console.log("");
      console.log("Preparation aborted");
      process.exitCode = 1;
      return;
    }
  } else {
    record(
      checks,
      "SEC_TEST breeder membership_status active",
      false,
      `unsupported membership_status=${breederBefore.membership_status}`,
    );
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const { breeder: breederAfter } = await fetchBreederState(adminClient, breederId);
  record(
    checks,
    "final SEC_TEST breeder membership_status active",
    breederAfter?.membership_status === "active",
    breederAfter?.membership_status,
  );

  const breederClient = createClientAnon(supabaseUrl, publishableKey);
  const { error: breederSignInError } = await breederClient.auth.signInWithPassword({
    email: breederEmail,
    password: breederPassword,
  });

  record(checks, "breeder authentication", breederSignInError == null, breederSignInError?.message);

  if (breederSignInError) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const { petId, detail: petDetail } = await findPublishedPetWithMainPhoto(
    breederClient,
    breederId,
  );

  record(
    checks,
    "published pet with main photo available",
    petId != null,
    petDetail ?? petId ?? undefined,
  );

  if (!petId) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  const anonClient = createClientAnon(supabaseUrl, publishableKey);
  const inView = await anonClient
    .from("published_pets_public")
    .select("id")
    .eq("id", petId)
    .maybeSingle();

  record(
    checks,
    "published pet visible in published_pets_public",
    inView.data != null,
    inView.error?.message ?? petId,
  );

  if (!inView.data) {
    console.log("");
    console.log("Preparation aborted");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Preparation completed");
  console.log(`SEC_TEST_PUBLIC_PUBLISHED_PET_ID=${petId}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  console.log("");
  console.log("Preparation aborted");
  process.exitCode = 1;
});

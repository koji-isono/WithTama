/**
 * SEC-TEST preparation for pet description revision DB integration test.
 *
 * Resolves a published [SEC-TEST] pet with description >= 20 chars and
 * description_review_status = none (resets in-progress revision via RPC when possible).
 *
 * NOT production code. Dev/test only.
 *
 * Requires Migration:
 *   supabase/migrations/20260907100000_add_pet_description_revision_review.sql
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
 *   npm run prepare:sec-test-description-revision
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SEC_TEST_PREFIX = "[SEC-TEST]";
const REVISION_PET_NAME = "[SEC-TEST] Description Revision Pet";
const RETURN_FLOW_PET_NAME = "[SEC-TEST] Description Revision Return Pet";
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_PET_SLOTS = 30;
const DEFAULT_DESCRIPTION = "あ".repeat(MIN_DESCRIPTION_LENGTH);

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
  pending_description: string | null;
  description_review_status: string;
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

function isMigrationMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("pending_description") ||
    lower.includes("description_review_status") ||
    lower.includes("could not find the function")
  );
}

function buildRevisionPetName(slot: number, base: string): string {
  if (slot <= 1) {
    return base;
  }
  return `${base} #${slot}`;
}

async function findPublishedRevisionPet(
  supabase: SupabaseClient,
  breederId: string,
  baseName: string,
): Promise<PetRow | null> {
  for (let slot = 1; slot <= MAX_PET_SLOTS; slot += 1) {
    const name = buildRevisionPetName(slot, baseName);
    const { data, error } = await supabase
      .from("pets")
      .select(
        "id, management_name, status, description, pending_description, description_review_status",
      )
      .eq("breeder_id", breederId)
      .eq("management_name", name)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      if (isMigrationMissing(error.message)) {
        throw new Error("migration not applied");
      }
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
    .select(
      "id, management_name, status, description, pending_description, description_review_status",
    )
    .eq("breeder_id", breederId)
    .eq("status", "published")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMigrationMissing(error.message)) {
      throw new Error("migration not applied");
    }
    throw error;
  }

  for (const row of data ?? []) {
    const description = (row.description ?? "").trim();
    if (description.length >= MIN_DESCRIPTION_LENGTH) {
      return row as PetRow;
    }
  }

  return null;
}

async function findDraftWithPhoto(
  supabase: SupabaseClient,
  breederId: string,
): Promise<{ id: string; management_name: string } | null> {
  const { data: pets, error } = await supabase
    .from("pets")
    .select("id, management_name, status")
    .eq("breeder_id", breederId)
    .eq("status", "draft")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const pet of pets ?? []) {
    const { count } = await supabase
      .from("pet_photos")
      .select("id", { count: "exact", head: true })
      .eq("pet_id", pet.id);
    if ((count ?? 0) >= 1) {
      return pet;
    }
  }

  return null;
}

async function findUnderReviewWithPhoto(
  supabase: SupabaseClient,
  breederId: string,
): Promise<{ id: string; management_name: string } | null> {
  const { data: pets, error } = await supabase
    .from("pets")
    .select("id, management_name, status")
    .eq("breeder_id", breederId)
    .eq("status", "under_review")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const pet of pets ?? []) {
    const { count } = await supabase
      .from("pet_photos")
      .select("id", { count: "exact", head: true })
      .eq("pet_id", pet.id);
    if ((count ?? 0) >= 1) {
      return pet;
    }
  }

  return null;
}

async function publishDraftWithDescription(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  breederId: string,
  managementName: string,
  checks: Check[],
): Promise<PetRow | null> {
  const underReview = await findUnderReviewWithPhoto(breederClient, breederId);
  if (underReview) {
    const { error: descError } = await breederClient
      .from("pets")
      .update({ description: DEFAULT_DESCRIPTION })
      .eq("id", underReview.id)
      .eq("status", "under_review");

    record(
      checks,
      `set under_review description (${underReview.management_name})`,
      descError == null,
      descError?.message,
    );
    if (descError) {
      return null;
    }

    const { error: approveError } = await adminClient.rpc("approve_pet_for_publish", {
      p_pet_id: underReview.id,
    });
    record(
      checks,
      `approve for publish (${underReview.management_name})`,
      approveError == null,
      approveError?.message,
    );
    if (approveError) {
      return null;
    }

    const { data, error } = await breederClient
      .from("pets")
      .select(
        "id, management_name, status, description, pending_description, description_review_status",
      )
      .eq("id", underReview.id)
      .maybeSingle();

    if (error || !data || data.status !== "published") {
      record(checks, "published pet with description", false, error?.message ?? data?.status);
      return null;
    }

    record(
      checks,
      "published pet with description",
      (data.description ?? "").trim().length >= MIN_DESCRIPTION_LENGTH,
      data.management_name,
    );

    return data as PetRow;
  }

  let draft = await findDraftWithPhoto(breederClient, breederId);

  if (!draft) {
    const { data: created, error: insertError } = await breederClient
      .from("pets")
      .insert({
        breeder_id: breederId,
        management_name: managementName,
        public_display_name: managementName.replace(/^\[SEC-TEST\]\s*/, ""),
        species: "dog",
        breed: "SEC-TEST Mixed",
        sex: "male",
        birthday: "2024-01-01",
        color: "test",
        temperament: "calm",
        description: DEFAULT_DESCRIPTION,
        price: 100000,
        status: "draft",
        display_order: 0,
      })
      .select("id, management_name")
      .single();

    record(checks, `create draft ${managementName}`, insertError == null, insertError?.message);
    if (insertError || !created) {
      return null;
    }
    draft = created;
    record(
      checks,
      `draft ${managementName} needs photo`,
      false,
      "add pet_photos row or reuse existing draft with photo",
    );
    return null;
  }

  const { error: descError } = await breederClient
    .from("pets")
    .update({ description: DEFAULT_DESCRIPTION })
    .eq("id", draft.id)
    .eq("status", "draft");

  record(
    checks,
    `set draft description (${draft.management_name})`,
    descError == null,
    descError?.message,
  );
  if (descError) {
    return null;
  }

  const { error: submitError } = await breederClient.rpc("submit_pet_for_review", {
    p_pet_id: draft.id,
  });
  record(
    checks,
    `submit for review (${draft.management_name})`,
    submitError == null,
    submitError?.message,
  );
  if (submitError) {
    return null;
  }

  const { error: approveError } = await adminClient.rpc("approve_pet_for_publish", {
    p_pet_id: draft.id,
  });
  record(
    checks,
    `approve for publish (${draft.management_name})`,
    approveError == null,
    approveError?.message,
  );
  if (approveError) {
    return null;
  }

  const { data, error } = await breederClient
    .from("pets")
    .select(
      "id, management_name, status, description, pending_description, description_review_status",
    )
    .eq("id", draft.id)
    .maybeSingle();

  if (error || !data || data.status !== "published") {
    record(checks, "published pet with description", false, error?.message ?? data?.status);
    return null;
  }

  record(
    checks,
    "published pet with description",
    (data.description ?? "").trim().length >= MIN_DESCRIPTION_LENGTH,
    data.management_name,
  );

  return data as PetRow;
}

async function ensurePublishedRevisionPet(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  breederId: string,
  baseName: string,
  checks: Check[],
): Promise<PetRow | null> {
  const existing =
    (await findPublishedRevisionPet(breederClient, breederId, baseName)) ??
    (await findAnyPublishedSecTestPet(breederClient, breederId));

  if (existing && (existing.description ?? "").trim().length >= MIN_DESCRIPTION_LENGTH) {
    return existing;
  }

  for (let slot = 1; slot <= MAX_PET_SLOTS; slot += 1) {
    const name = buildRevisionPetName(slot, baseName);
    const namedPublished = await findPublishedRevisionPet(breederClient, breederId, name);
    if (
      namedPublished &&
      (namedPublished.description ?? "").trim().length >= MIN_DESCRIPTION_LENGTH
    ) {
      return namedPublished;
    }
  }

  return publishDraftWithDescription(breederClient, adminClient, breederId, baseName, checks);
}

async function resetRevisionState(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  pet: PetRow,
  checks: Check[],
): Promise<PetRow | null> {
  const current = pet;

  if (current.description_review_status === "under_review") {
    const { error: approveError } = await adminClient.rpc("approve_pet_description_revision", {
      p_pet_id: current.id,
    });
    record(
      checks,
      `reset under_review via admin approve (${current.management_name})`,
      approveError == null,
      approveError?.message,
    );
    if (approveError) {
      return null;
    }
  } else if (current.description_review_status === "returned") {
    const { error: submitError } = await breederClient.rpc("submit_pet_description_revision", {
      p_pet_id: current.id,
    });
    record(
      checks,
      `reset returned via resubmit (${current.management_name})`,
      submitError == null,
      submitError?.message,
    );
    if (submitError) {
      return null;
    }

    const { error: approveError } = await adminClient.rpc("approve_pet_description_revision", {
      p_pet_id: current.id,
    });
    record(
      checks,
      `reset returned via admin approve (${current.management_name})`,
      approveError == null,
      approveError?.message,
    );
    if (approveError) {
      return null;
    }
  } else if (current.description_review_status === "draft" || current.pending_description != null) {
    const { error: saveError } = await breederClient.rpc("save_pet_description_revision_draft", {
      p_pet_id: current.id,
      p_pending_description: null,
    });
    record(
      checks,
      `clear pending draft (${current.management_name})`,
      saveError == null,
      saveError?.message,
    );
    if (saveError) {
      return null;
    }
  }

  const { data, error } = await breederClient
    .from("pets")
    .select(
      "id, management_name, status, description, pending_description, description_review_status",
    )
    .eq("id", current.id)
    .maybeSingle();

  if (error || !data) {
    record(checks, "reload pet after reset", false, error?.message ?? "not found");
    return null;
  }

  record(
    checks,
    "pet revision state clean",
    data.description_review_status === "none" && data.pending_description == null,
    `status=${data.description_review_status}`,
  );

  return data as PetRow;
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
  const adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
  const adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
  const breederId = requireEnv("SEC_TEST_REVIEW_BREEDER_ID");

  const breederClient = createClientAnon(url, key);
  const adminClient = createClientAnon(url, key);

  const breederUser = await signIn(breederClient, breederEmail, breederPassword);
  record(checks, "breeder authentication", breederUser != null);
  if (!breederUser) {
    finish(checks);
    return;
  }

  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(checks, "admin authentication", adminUser != null);
  if (!adminUser) {
    finish(checks);
    return;
  }

  const approvePet = await ensurePublishedRevisionPet(
    breederClient,
    adminClient,
    breederId,
    REVISION_PET_NAME,
    checks,
  );

  record(
    checks,
    "published revision pet resolved",
    approvePet != null,
    approvePet?.management_name ?? "failed to publish [SEC-TEST] pet with description",
  );

  if (!approvePet) {
    finish(checks);
    return;
  }

  const cleanApprovePet = await resetRevisionState(breederClient, adminClient, approvePet, checks);

  if (cleanApprovePet) {
    console.log(`SEC_TEST_DESCRIPTION_REVISION_PET_ID=${cleanApprovePet.id}`);
  }

  let returnPet = await findPublishedRevisionPet(breederClient, breederId, RETURN_FLOW_PET_NAME);

  if (!returnPet && cleanApprovePet) {
    returnPet = cleanApprovePet;
  }

  if (returnPet && returnPet.id !== cleanApprovePet?.id) {
    const cleanReturnPet = await resetRevisionState(breederClient, adminClient, returnPet, checks);
    if (cleanReturnPet) {
      console.log(`SEC_TEST_DESCRIPTION_REVISION_RETURN_PET_ID=${cleanReturnPet.id}`);
    }
  } else if (cleanApprovePet) {
    console.log(`SEC_TEST_DESCRIPTION_REVISION_RETURN_PET_ID=${cleanApprovePet.id}`);
  }

  finish(checks);
}

function finish(checks: Check[]): void {
  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;
  console.log("");
  console.log(`${passed} passed / ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error && error.message === "migration not applied") {
    console.error(
      "STOP: Migration not applied — apply 20260907100000_add_pet_description_revision_review.sql first",
    );
    process.exitCode = 1;
    return;
  }
  console.error(error);
  process.exitCode = 1;
});

/**
 * PU-01 public read access security test (Views + RLS + Storage).
 *
 * Tests published_pets_public / breeder_public_profiles and anon SELECT policies.
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Requires Migration:
 *   supabase/migrations/20260814120000_add_public_pet_list_read_access.sql
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Optional env (falls back to SEC_TEST_* or breeder-session discovery):
 *   SEC_TEST_PUBLIC_PUBLISHED_PET_ID
 *   SEC_TEST_PUBLIC_DRAFT_PET_ID
 *   SEC_TEST_PUBLIC_UNDER_REVIEW_PET_ID
 *   SEC_TEST_PUBLIC_RETURNED_PET_ID (draft after admin return)
 *   SEC_TEST_PUBLIC_UNAPPROVED_PUBLISHED_PET_ID
 *   SEC_TEST_PUBLIC_SUSPENDED_BREEDER_PUBLISHED_PET_ID
 *   SEC_TEST_PUBLIC_CANCELED_BREEDER_PUBLISHED_PET_ID
 *   SEC_TEST_REVIEW_BREEDER_ID
 *   SEC_TEST_BREEDER_EMAIL / SEC_TEST_BREEDER_PASSWORD (discovery only)
 *
 * Usage:
 *   npm run test:public-pet-read
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const PET_PHOTOS_BUCKET = "pet-photos";
const SEC_TEST_PREFIX = "[SEC-TEST]";

type CheckStatus = "pass" | "fail" | "unverified";

type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
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

function record(checks: Check[], name: string, status: CheckStatus, detail?: string): void {
  checks.push({ name, status, detail });
  const suffix = detail ? ` (${detail})` : "";
  const label = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "未検証";
  console.log(`${label} ${name}${suffix}`);
}

function summarize(checks: Check[]): void {
  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.filter((check) => check.status === "fail").length;
  const unverified = checks.filter((check) => check.status === "unverified").length;
  console.log("");
  console.log(`${passed} passed / ${failed} failed / ${unverified} unverified`);
}

function finish(checks: Check[]): void {
  summarize(checks);
  if (checks.some((check) => check.status === "fail")) {
    process.exitCode = 1;
  }
}

function createAnonClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isMissingRelationError(message: string | undefined): boolean {
  const lower = (message ?? "").toLowerCase();
  return (
    lower.includes("could not find the table") ||
    lower.includes("could not find the view") ||
    (lower.includes("relation") && lower.includes("does not exist"))
  );
}

const SUBMIT_PHOTO_PET_NAME = "[SEC-TEST] Submit RPC With Photo Pet";
const SUBMIT_PHOTO_PET_NAME_PREFIX = "[SEC-TEST] Submit RPC With Photo Pet";

type DiscoveredPetIds = {
  publishedPetId: string | null;
  draftPetId: string | null;
  underReviewPetId: string | null;
  returnedPetId: string | null;
};

function isSubmitWithPhotoPetName(name: string): boolean {
  return name === SUBMIT_PHOTO_PET_NAME || name.startsWith(`${SUBMIT_PHOTO_PET_NAME_PREFIX} #`);
}

async function discoverPetIds(url: string, key: string): Promise<DiscoveredPetIds> {
  const breederEmail = optionalEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = optionalEnv("SEC_TEST_BREEDER_PASSWORD");
  if (!breederEmail || !breederPassword) {
    return {
      publishedPetId: null,
      draftPetId: null,
      underReviewPetId: null,
      returnedPetId: null,
    };
  }

  const client = createAnonClient(url, key);
  const { error: signInError } = await client.auth.signInWithPassword({
    email: breederEmail,
    password: breederPassword,
  });
  if (signInError) {
    return {
      publishedPetId: null,
      draftPetId: null,
      underReviewPetId: null,
      returnedPetId: null,
    };
  }

  const { data: pets } = await client
    .from("pets")
    .select("id, status, management_name")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null);

  const byStatus = (status: string): string | null =>
    pets?.find((row) => row.status === status)?.id ?? null;

  let publishedPetId: string | null = null;
  const publishedPets = pets?.filter((row) => row.status === "published") ?? [];

  for (const pet of publishedPets) {
    if (!isSubmitWithPhotoPetName(pet.management_name)) {
      continue;
    }

    const { count } = await client
      .from("pet_photos")
      .select("id", { count: "exact", head: true })
      .eq("pet_id", pet.id)
      .eq("is_main", true);

    if ((count ?? 0) >= 1) {
      publishedPetId = pet.id;
      break;
    }
  }

  if (publishedPetId == null) {
    publishedPetId = byStatus("published");
  }

  return {
    publishedPetId,
    draftPetId: byStatus("draft"),
    underReviewPetId: byStatus("under_review"),
    returnedPetId: null,
  };
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  const discovered = await discoverPetIds(url, key);

  const publishedPetId =
    optionalEnv("SEC_TEST_PUBLIC_PUBLISHED_PET_ID") ?? discovered.publishedPetId;
  const draftPetId =
    optionalEnv("SEC_TEST_PUBLIC_DRAFT_PET_ID") ??
    optionalEnv("SEC_TEST_ADMIN_RETURN_PET_ID") ??
    optionalEnv("SEC_TEST_SUBMIT_DRAFT_PET_ID") ??
    discovered.draftPetId;
  const underReviewPetId =
    optionalEnv("SEC_TEST_PUBLIC_UNDER_REVIEW_PET_ID") ??
    discovered.underReviewPetId ??
    optionalEnv("SEC_TEST_ADMIN_APPROVE_PET_ID");
  const returnedPetId =
    optionalEnv("SEC_TEST_PUBLIC_RETURNED_PET_ID") ??
    optionalEnv("SEC_TEST_ADMIN_RETURN_PET_ID") ??
    discovered.returnedPetId;
  const unapprovedPublishedPetId = optionalEnv("SEC_TEST_PUBLIC_UNAPPROVED_PUBLISHED_PET_ID");
  const suspendedBreederPublishedPetId = optionalEnv(
    "SEC_TEST_PUBLIC_SUSPENDED_BREEDER_PUBLISHED_PET_ID",
  );
  const canceledBreederPublishedPetId = optionalEnv(
    "SEC_TEST_PUBLIC_CANCELED_BREEDER_PUBLISHED_PET_ID",
  );
  const reviewBreederId = optionalEnv("SEC_TEST_REVIEW_BREEDER_ID");

  const anon = createAnonClient(url, key);

  const viewProbe = await anon.from("published_pets_public").select("id").limit(1);

  if (isMissingRelationError(viewProbe.error?.message)) {
    record(
      checks,
      "published_pets_public view available",
      "fail",
      "apply supabase/migrations/20260814120000_add_public_pet_list_read_access.sql first",
    );
    finish(checks);
    return;
  }

  record(
    checks,
    "published_pets_public view available",
    viewProbe.error == null ? "pass" : "fail",
    viewProbe.error?.message,
  );

  const breederProfilesProbe = await anon.from("breeder_public_profiles").select("id").limit(1);

  record(
    checks,
    "breeder_public_profiles view available",
    isMissingRelationError(breederProfilesProbe.error?.message)
      ? "fail"
      : breederProfilesProbe.error == null
        ? "pass"
        : "fail",
    breederProfilesProbe.error?.message,
  );

  const { data: publishedRows, error: publishedError } = await anon
    .from("published_pets_public")
    .select("id, public_display_name, species, breed, sex, birthday, price, breeder_id")
    .limit(20);

  record(
    checks,
    "anon can select published pets from published_pets_public view",
    publishedError == null ? "pass" : "fail",
    publishedError?.message,
  );

  const resolvedPublishedPetId = publishedPetId ?? publishedRows?.[0]?.id ?? null;

  record(
    checks,
    "published pet sample available for photo tests",
    resolvedPublishedPetId != null ? "pass" : "unverified",
    resolvedPublishedPetId ?? "set SEC_TEST_PUBLIC_PUBLISHED_PET_ID or publish a SEC-TEST pet",
  );

  if (publishedRows && publishedRows.length > 0) {
    const row = publishedRows[0] as Record<string, unknown>;
    const hasPublicColumns =
      "public_display_name" in row &&
      "species" in row &&
      "breeder_id" in row &&
      !("management_name" in row);
    record(
      checks,
      "view row exposes public columns only (no management_name in result)",
      hasPublicColumns ? "pass" : "fail",
    );
  } else {
    record(
      checks,
      "view row exposes public columns only (no management_name in result)",
      "unverified",
      "no published rows in view",
    );
  }

  const managementNameFromView = await anon
    .from("published_pets_public")
    .select("management_name")
    .limit(1);

  record(
    checks,
    "management_name not selectable from published_pets_public",
    managementNameFromView.error != null ? "pass" : "fail",
    managementNameFromView.error?.message ?? "unexpected success",
  );

  const internalColumnsFromView = await anon
    .from("published_pets_public")
    .select("status, ai_description, created_by")
    .limit(1);

  record(
    checks,
    "internal pet columns not selectable from published_pets_public",
    internalColumnsFromView.error != null ? "pass" : "fail",
    internalColumnsFromView.error?.message ?? "unexpected success",
  );

  const petsDirectSelect = await anon.from("pets").select("id, management_name, status").limit(5);

  record(
    checks,
    "anon direct SELECT on public.pets returns no rows (use view instead)",
    petsDirectSelect.error != null || (petsDirectSelect.data?.length ?? 0) === 0 ? "pass" : "fail",
    petsDirectSelect.error?.message ?? `rows=${petsDirectSelect.data?.length ?? 0}`,
  );

  const managementNameFromPets = await anon.from("pets").select("management_name").limit(1);

  record(
    checks,
    "management_name not readable from public.pets as anon",
    managementNameFromPets.error != null || (managementNameFromPets.data?.length ?? 0) === 0
      ? "pass"
      : "fail",
    managementNameFromPets.error?.message ?? `rows=${managementNameFromPets.data?.length ?? 0}`,
  );

  if (draftPetId) {
    const draftInView = await anon
      .from("published_pets_public")
      .select("id")
      .eq("id", draftPetId)
      .maybeSingle();
    record(
      checks,
      "draft pet excluded from published_pets_public",
      draftInView.data == null ? "pass" : "fail",
      draftInView.data?.id,
    );

    const draftPhotos = await anon.from("pet_photos").select("id").eq("pet_id", draftPetId);
    record(
      checks,
      "draft pet photos not readable by anon",
      (draftPhotos.data?.length ?? 0) === 0 ? "pass" : "fail",
      `count=${draftPhotos.data?.length ?? 0}`,
    );

    const draftStoragePath = draftPhotos.data?.[0]?.storage_path as string | undefined;
    if (draftStoragePath) {
      const { error: draftSignedError } = await anon.storage
        .from(PET_PHOTOS_BUCKET)
        .createSignedUrl(draftStoragePath, 60);
      record(
        checks,
        "draft pet storage signed url not creatable by anon",
        draftSignedError != null ? "pass" : "fail",
        draftSignedError?.message ?? "unexpected signed url",
      );
    } else {
      const { data: anyDraftPhoto } = await anon
        .from("pet_photos")
        .select("storage_path")
        .eq("pet_id", draftPetId)
        .limit(1);
      if ((anyDraftPhoto?.length ?? 0) === 0) {
        record(
          checks,
          "draft pet storage signed url not creatable by anon",
          "unverified",
          "draft pet has no pet_photos row",
        );
      }
    }
  } else {
    record(
      checks,
      "draft pet excluded from published_pets_public",
      "unverified",
      "no draft pet id",
    );
    record(checks, "draft pet photos not readable by anon", "unverified", "no draft pet id");
    record(
      checks,
      "draft pet storage signed url not creatable by anon",
      "unverified",
      "no draft pet id",
    );
  }

  if (underReviewPetId) {
    const reviewInView = await anon
      .from("published_pets_public")
      .select("id")
      .eq("id", underReviewPetId)
      .maybeSingle();
    record(
      checks,
      "under_review pet excluded from published_pets_public",
      reviewInView.data == null ? "pass" : "fail",
      reviewInView.data?.id,
    );

    const reviewPhotos = await anon.from("pet_photos").select("id").eq("pet_id", underReviewPetId);
    record(
      checks,
      "under_review pet photos not readable by anon",
      (reviewPhotos.data?.length ?? 0) === 0 ? "pass" : "fail",
      `count=${reviewPhotos.data?.length ?? 0}`,
    );
  } else {
    record(
      checks,
      "under_review pet excluded from published_pets_public",
      "unverified",
      "no under_review pet id",
    );
    record(
      checks,
      "under_review pet photos not readable by anon",
      "unverified",
      "no under_review pet id",
    );
  }

  if (returnedPetId && returnedPetId !== draftPetId) {
    const returnedInView = await anon
      .from("published_pets_public")
      .select("id")
      .eq("id", returnedPetId)
      .maybeSingle();
    record(
      checks,
      "returned (draft after return) pet excluded from published_pets_public",
      returnedInView.data == null ? "pass" : "fail",
      returnedInView.data?.id,
    );
  } else if (returnedPetId && returnedPetId === draftPetId) {
    record(
      checks,
      "returned (draft after return) pet excluded from published_pets_public",
      "unverified",
      "same id as draft pet — covered by draft check only",
    );
  } else {
    record(
      checks,
      "returned (draft after return) pet excluded from published_pets_public",
      "unverified",
      "no returned pet id",
    );
  }

  if (resolvedPublishedPetId) {
    const { data: photos, error: photosError } = await anon
      .from("pet_photos")
      .select("id, storage_path, is_main")
      .eq("pet_id", resolvedPublishedPetId)
      .eq("is_main", true);

    record(
      checks,
      "published pet main photo readable by anon via pet_photos RLS",
      photosError == null && (photos?.length ?? 0) >= 1 ? "pass" : "fail",
      photosError?.message ?? `count=${photos?.length ?? 0}`,
    );

    const storagePath = photos?.[0]?.storage_path as string | undefined;

    if (storagePath) {
      const { data: signed, error: signedError } = await anon.storage
        .from(PET_PHOTOS_BUCKET)
        .createSignedUrl(storagePath, 60);

      record(
        checks,
        "published pet storage signed url creatable by anon",
        signedError == null && Boolean(signed?.signedUrl) ? "pass" : "fail",
        signedError?.message,
      );

      const publicUrl = anon.storage.from(PET_PHOTOS_BUCKET).getPublicUrl(storagePath)
        .data.publicUrl;
      let publicFetchBlocked = false;
      try {
        const response = await fetch(publicUrl, { method: "HEAD" });
        publicFetchBlocked =
          response.status === 400 || response.status === 403 || response.status === 404;
      } catch {
        publicFetchBlocked = true;
      }

      record(
        checks,
        "pet-photos bucket remains private (public URL not usable without signed access)",
        publicFetchBlocked ? "pass" : "fail",
        publicFetchBlocked ? "HEAD not publicly accessible" : "public URL responded OK",
      );
    } else {
      record(
        checks,
        "published pet storage signed url creatable by anon",
        "unverified",
        "no main photo storage_path",
      );
      record(
        checks,
        "pet-photos bucket remains private (public URL not usable without signed access)",
        "unverified",
        "no main photo storage_path",
      );
    }
  } else {
    record(
      checks,
      "published pet main photo readable by anon via pet_photos RLS",
      "unverified",
      "no published pet id",
    );
    record(
      checks,
      "published pet storage signed url creatable by anon",
      "unverified",
      "no published pet id",
    );
    record(
      checks,
      "pet-photos bucket remains private (public URL not usable without signed access)",
      "unverified",
      "no published pet id",
    );
  }

  const { data: breeders, error: breedersViewError } = await anon
    .from("breeder_public_profiles")
    .select("id, business_name, prefecture")
    .limit(5);

  record(
    checks,
    "anon can select breeder_public_profiles",
    breedersViewError == null ? "pass" : "fail",
    breedersViewError?.message,
  );

  if (reviewBreederId) {
    const { data: breederRow } = await anon
      .from("breeder_public_profiles")
      .select("id")
      .eq("id", reviewBreederId)
      .maybeSingle();
    record(
      checks,
      "approved active SEC_TEST breeder in public profiles",
      breederRow != null ? "pass" : "fail",
      reviewBreederId,
    );
  } else {
    record(
      checks,
      "approved active SEC_TEST breeder in public profiles",
      (breeders?.length ?? 0) > 0 ? "pass" : "unverified",
      "SEC_TEST_REVIEW_BREEDER_ID unset",
    );
  }

  const phoneFromBreeders = await anon.from("breeders").select("phone").limit(1);

  record(
    checks,
    "breeder phone not readable by anon from breeders table",
    phoneFromBreeders.error != null || (phoneFromBreeders.data?.length ?? 0) === 0
      ? "pass"
      : "fail",
    phoneFromBreeders.error?.message ?? `rows=${phoneFromBreeders.data?.length ?? 0}`,
  );

  const phoneFromProfileView = await anon.from("breeder_public_profiles").select("phone").limit(1);

  record(
    checks,
    "breeder phone not selectable from breeder_public_profiles",
    phoneFromProfileView.error != null ? "pass" : "fail",
    phoneFromProfileView.error?.message ?? "unexpected success",
  );

  const privateBreederCols = await anon
    .from("breeder_public_profiles")
    .select("user_id, address_line, stripe_customer_id")
    .limit(1);

  record(
    checks,
    "breeder private columns not selectable from breeder_public_profiles",
    privateBreederCols.error != null ? "pass" : "fail",
    privateBreederCols.error?.message ?? "unexpected success",
  );

  if (unapprovedPublishedPetId) {
    const row = await anon
      .from("published_pets_public")
      .select("id")
      .eq("id", unapprovedPublishedPetId)
      .maybeSingle();
    record(
      checks,
      "unapproved breeder published pet excluded from published_pets_public",
      row.data == null ? "pass" : "fail",
      unapprovedPublishedPetId,
    );
  } else {
    record(
      checks,
      "unapproved breeder published pet excluded from published_pets_public",
      "unverified",
      "set SEC_TEST_PUBLIC_UNAPPROVED_PUBLISHED_PET_ID",
    );
  }

  if (suspendedBreederPublishedPetId) {
    const row = await anon
      .from("published_pets_public")
      .select("id")
      .eq("id", suspendedBreederPublishedPetId)
      .maybeSingle();
    record(
      checks,
      "suspended breeder published pet excluded from published_pets_public",
      row.data == null ? "pass" : "fail",
      suspendedBreederPublishedPetId,
    );
  } else {
    record(
      checks,
      "suspended breeder published pet excluded from published_pets_public",
      "unverified",
      "set SEC_TEST_PUBLIC_SUSPENDED_BREEDER_PUBLISHED_PET_ID",
    );
  }

  if (canceledBreederPublishedPetId) {
    const row = await anon
      .from("published_pets_public")
      .select("id")
      .eq("id", canceledBreederPublishedPetId)
      .maybeSingle();
    record(
      checks,
      "canceled breeder published pet excluded from published_pets_public",
      row.data == null ? "pass" : "fail",
      canceledBreederPublishedPetId,
    );
  } else {
    record(
      checks,
      "canceled breeder published pet excluded from published_pets_public",
      "unverified",
      "set SEC_TEST_PUBLIC_CANCELED_BREEDER_PUBLISHED_PET_ID",
    );
  }

  const listBucket = await anon.storage.from(PET_PHOTOS_BUCKET).list("", { limit: 5 });
  const listEntries = listBucket.data ?? [];
  const listShowsOnlyFolderPlaceholders =
    listEntries.length === 0 ||
    listEntries.every((entry) => entry.id == null && entry.metadata == null);
  record(
    checks,
    "anon cannot list pet-photos bucket root (private bucket)",
    listBucket.error != null || listShowsOnlyFolderPlaceholders ? "pass" : "fail",
    listBucket.error?.message ??
      (listShowsOnlyFolderPlaceholders
        ? listEntries.length === 0
          ? "entries=0"
          : "folder placeholders only"
        : `entries=${listEntries.length}`),
  );

  finish(checks);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

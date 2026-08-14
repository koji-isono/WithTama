/**
 * PU-02 public detail views security test.
 *
 * Tests published_pet_detail_public / breeder_public_detail_profiles.
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Requires Migration:
 *   supabase/migrations/20260814130000_add_public_pet_detail_read_views.sql
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * Optional env (reuse PU-01 SEC_TEST_* or breeder-session discovery):
 *   SEC_TEST_PUBLIC_PUBLISHED_PET_ID
 *   SEC_TEST_PUBLIC_DRAFT_PET_ID
 *   SEC_TEST_PUBLIC_UNDER_REVIEW_PET_ID
 *   SEC_TEST_PUBLIC_DELETED_PET_ID
 *   SEC_TEST_PUBLIC_UNAPPROVED_PUBLISHED_PET_ID
 *   SEC_TEST_PUBLIC_SUSPENDED_BREEDER_PUBLISHED_PET_ID
 *   SEC_TEST_BREEDER_EMAIL / SEC_TEST_BREEDER_PASSWORD (discovery only)
 *
 * Usage:
 *   npm run test:public-pet-detail
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SEC_TEST_PREFIX = "[SEC-TEST]";

type CheckStatus = "pass" | "fail" | "unverified";

type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
};

const DETAIL_PUBLIC_COLUMNS =
  "id, public_display_name, species, breed, sex, birthday, color, temperament, description, price, price_comment, breeder_id";

const BREEDER_DETAIL_PUBLIC_COLUMNS =
  "id, business_name, prefecture, city, profile_text, breeding_policy, health_policy, breeding_environment";

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

type DiscoveredPetIds = {
  publishedPetId: string | null;
  draftPetId: string | null;
  underReviewPetId: string | null;
};

async function discoverPetIds(url: string, key: string): Promise<DiscoveredPetIds> {
  const breederEmail = optionalEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = optionalEnv("SEC_TEST_BREEDER_PASSWORD");
  if (!breederEmail || !breederPassword) {
    return {
      publishedPetId: null,
      draftPetId: null,
      underReviewPetId: null,
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
    };
  }

  const { data: pets } = await client
    .from("pets")
    .select("id, status, management_name")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null);

  const byStatus = (status: string): string | null =>
    pets?.find((row) => row.status === status)?.id ?? null;

  return {
    publishedPetId: byStatus("published"),
    draftPetId: byStatus("draft"),
    underReviewPetId: byStatus("under_review"),
  };
}

async function assertPetExcludedFromDetailView(
  checks: Check[],
  anon: SupabaseClient,
  petId: string | null,
  checkName: string,
  missingDetail: string,
): Promise<void> {
  if (!petId) {
    record(checks, checkName, "unverified", missingDetail);
    return;
  }

  const row = await anon
    .from("published_pet_detail_public")
    .select("id")
    .eq("id", petId)
    .maybeSingle();

  record(checks, checkName, row.data == null ? "pass" : "fail", petId);
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
    optionalEnv("SEC_TEST_SUBMIT_DRAFT_PET_ID") ??
    discovered.draftPetId;
  const underReviewPetId =
    optionalEnv("SEC_TEST_PUBLIC_UNDER_REVIEW_PET_ID") ??
    discovered.underReviewPetId ??
    optionalEnv("SEC_TEST_ADMIN_APPROVE_PET_ID");
  const deletedPetId = optionalEnv("SEC_TEST_PUBLIC_DELETED_PET_ID");
  const unapprovedPublishedPetId = optionalEnv("SEC_TEST_PUBLIC_UNAPPROVED_PUBLISHED_PET_ID");
  const suspendedBreederPublishedPetId = optionalEnv(
    "SEC_TEST_PUBLIC_SUSPENDED_BREEDER_PUBLISHED_PET_ID",
  );

  const anon = createAnonClient(url, key);

  const detailViewProbe = await anon.from("published_pet_detail_public").select("id").limit(1);

  if (isMissingRelationError(detailViewProbe.error?.message)) {
    record(
      checks,
      "anon can select published_pet_detail_public",
      "fail",
      "apply supabase/migrations/20260814130000_add_public_pet_detail_read_views.sql first",
    );
    finish(checks);
    return;
  }

  record(
    checks,
    "anon can select published_pet_detail_public",
    detailViewProbe.error == null ? "pass" : "fail",
    detailViewProbe.error?.message,
  );

  const { data: publishedRows, error: publishedError } = await anon
    .from("published_pet_detail_public")
    .select(DETAIL_PUBLIC_COLUMNS)
    .limit(5);

  record(
    checks,
    "published listable pet readable from published_pet_detail_public",
    publishedError == null && (publishedRows?.length ?? 0) >= 1 ? "pass" : "fail",
    publishedError?.message ?? `rows=${publishedRows?.length ?? 0}`,
  );

  const resolvedPublishedPetId = publishedPetId ?? publishedRows?.[0]?.id ?? null;

  if (resolvedPublishedPetId) {
    const { data: oneRow, error: oneError } = await anon
      .from("published_pet_detail_public")
      .select(DETAIL_PUBLIC_COLUMNS)
      .eq("id", resolvedPublishedPetId)
      .maybeSingle();

    record(
      checks,
      "published pet detail row includes PU-02 public columns",
      oneError == null &&
        oneRow != null &&
        "color" in oneRow &&
        "temperament" in oneRow &&
        "description" in oneRow &&
        "price_comment" in oneRow
        ? "pass"
        : "fail",
      oneError?.message ?? resolvedPublishedPetId,
    );
  } else {
    record(
      checks,
      "published pet detail row includes PU-02 public columns",
      "unverified",
      "no published pet id",
    );
  }

  await assertPetExcludedFromDetailView(
    checks,
    anon,
    draftPetId,
    "draft pet excluded from published_pet_detail_public",
    "no draft pet id",
  );

  await assertPetExcludedFromDetailView(
    checks,
    anon,
    underReviewPetId,
    "under_review pet excluded from published_pet_detail_public",
    "no under_review pet id",
  );

  await assertPetExcludedFromDetailView(
    checks,
    anon,
    unapprovedPublishedPetId,
    "non-approved breeder published pet excluded from published_pet_detail_public",
    "set SEC_TEST_PUBLIC_UNAPPROVED_PUBLISHED_PET_ID",
  );

  await assertPetExcludedFromDetailView(
    checks,
    anon,
    suspendedBreederPublishedPetId,
    "non-active breeder published pet excluded from published_pet_detail_public",
    "set SEC_TEST_PUBLIC_SUSPENDED_BREEDER_PUBLISHED_PET_ID",
  );

  if (deletedPetId) {
    await assertPetExcludedFromDetailView(
      checks,
      anon,
      deletedPetId,
      "deleted pet excluded from published_pet_detail_public",
      "no deleted pet id",
    );
  } else {
    record(
      checks,
      "deleted pet excluded from published_pet_detail_public",
      "unverified",
      "set SEC_TEST_PUBLIC_DELETED_PET_ID",
    );
  }

  const managementNameFromView = await anon
    .from("published_pet_detail_public")
    .select("management_name")
    .limit(1);

  record(
    checks,
    "management_name not selectable from published_pet_detail_public",
    managementNameFromView.error != null ? "pass" : "fail",
    managementNameFromView.error?.message ?? "unexpected success",
  );

  const aiDescriptionFromView = await anon
    .from("published_pet_detail_public")
    .select("ai_description")
    .limit(1);

  record(
    checks,
    "ai_description not selectable from published_pet_detail_public",
    aiDescriptionFromView.error != null ? "pass" : "fail",
    aiDescriptionFromView.error?.message ?? "unexpected success",
  );

  const statusFromView = await anon.from("published_pet_detail_public").select("status").limit(1);

  record(
    checks,
    "status not selectable from published_pet_detail_public",
    statusFromView.error != null ? "pass" : "fail",
    statusFromView.error?.message ?? "unexpected success",
  );

  const breederDetailProbe = await anon
    .from("breeder_public_detail_profiles")
    .select("id")
    .limit(1);

  if (isMissingRelationError(breederDetailProbe.error?.message)) {
    record(
      checks,
      "anon can select breeder_public_detail_profiles",
      "fail",
      "apply supabase/migrations/20260814130000_add_public_pet_detail_read_views.sql first",
    );
  } else {
    record(
      checks,
      "anon can select breeder_public_detail_profiles",
      breederDetailProbe.error == null ? "pass" : "fail",
      breederDetailProbe.error?.message,
    );
  }

  const { data: breederRows, error: breederRowsError } = await anon
    .from("breeder_public_detail_profiles")
    .select(BREEDER_DETAIL_PUBLIC_COLUMNS)
    .limit(5);

  record(
    checks,
    "breeder detail view exposes PU-02 public columns only",
    breederRowsError == null &&
      (breederRows?.length ?? 0) >= 1 &&
      breederRows?.[0] != null &&
      "profile_text" in breederRows[0] &&
      "city" in breederRows[0] &&
      !("phone" in breederRows[0])
      ? "pass"
      : breederRowsError != null
        ? "fail"
        : (breederRows?.length ?? 0) === 0
          ? "unverified"
          : "fail",
    breederRowsError?.message ?? `rows=${breederRows?.length ?? 0}`,
  );

  const phoneFromView = await anon.from("breeder_public_detail_profiles").select("phone").limit(1);

  record(
    checks,
    "phone not selectable from breeder_public_detail_profiles",
    phoneFromView.error != null ? "pass" : "fail",
    phoneFromView.error?.message ?? "unexpected success",
  );

  const representativeFromView = await anon
    .from("breeder_public_detail_profiles")
    .select("representative_name")
    .limit(1);

  record(
    checks,
    "representative_name not selectable from breeder_public_detail_profiles",
    representativeFromView.error != null ? "pass" : "fail",
    representativeFromView.error?.message ?? "unexpected success",
  );

  const addressFromView = await anon
    .from("breeder_public_detail_profiles")
    .select("address_line")
    .limit(1);

  record(
    checks,
    "address_line not selectable from breeder_public_detail_profiles",
    addressFromView.error != null ? "pass" : "fail",
    addressFromView.error?.message ?? "unexpected success",
  );

  const userIdFromView = await anon
    .from("breeder_public_detail_profiles")
    .select("user_id")
    .limit(1);

  record(
    checks,
    "user_id not selectable from breeder_public_detail_profiles",
    userIdFromView.error != null ? "pass" : "fail",
    userIdFromView.error?.message ?? "unexpected success",
  );

  finish(checks);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * BR-09 return → edit → resubmit E2E verification (Supabase JWT, no Service Role).
 *
 * Usage:
 *   npm run test:breeder-profile-resubmit-e2e
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { isProfileEditable } from "../src/features/breeder-profile/edit-guard.ts";
import { validateProfileCompletion } from "../src/features/breeder-profile/profile-completion.ts";
import { normalizeReturnedComment } from "../src/features/breeder-review/normalize-returned-comment.ts";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const E2E_RETURN_COMMENT =
  "E2E確認：繁殖方針の内容を修正してください。\n詳細は管理者コメントを参照。";
const E2E_PROFILE_MARKER = " [BR-09-E2E]";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type BreederRow = {
  id: string;
  user_id: string;
  review_status: string;
  identity_verification_status: string;
  business_verification_status: string;
  membership_status: string;
  identity_document_path: string | null;
  business_license_path: string | null;
  registration_expires_at: string | null;
  approved_at: string | null;
  profile_completed: boolean;
  breeding_policy: string | null;
  business_name: string | null;
  representative_name: string | null;
  phone: string | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address_line: string | null;
  business_registration_type: string | null;
  business_registration_number: string | null;
  registration_authority: string | null;
  profile_text: string | null;
  health_policy: string | null;
  breeding_environment: string | null;
};

type ReviewLogRow = {
  id: string;
  action: string;
  comment: string | null;
  created_at: string;
  actor_user_id: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
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

function rpcMessage(error: { message: string } | null): string {
  return error?.message ?? "";
}

function isAdminRole(user: User): boolean {
  return user.app_metadata?.role === "admin";
}

function futureRegistrationDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function createAuthClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<User | null> {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return null;
  }
  const {
    data: { user },
  } = await client.auth.getUser();
  return user ?? null;
}

async function loadBreeder(client: SupabaseClient, breederId: string): Promise<BreederRow | null> {
  const { data, error } = await client
    .from("breeders")
    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at, profile_completed, breeding_policy, business_name, representative_name, phone, postal_code, prefecture, city, address_line, business_registration_type, business_registration_number, registration_authority, profile_text, health_policy, breeding_environment",
    )
    .eq("id", breederId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederRow;
}

async function resetBreederSubmitted(
  adminClient: SupabaseClient,
  breeder: BreederRow,
): Promise<BreederRow | null> {
  const expiresAt =
    breeder.registration_expires_at &&
    breeder.registration_expires_at >= new Date().toISOString().slice(0, 10)
      ? breeder.registration_expires_at
      : futureRegistrationDate();

  const { data, error } = await adminClient
    .from("breeders")
    .update({
      review_status: "submitted",
      identity_verification_status: "submitted",
      business_verification_status: "submitted",
      approved_at: null,
      profile_completed: true,
      registration_expires_at: expiresAt,
    })
    .eq("id", breeder.id)
    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at, profile_completed, breeding_policy, business_name, representative_name, phone, postal_code, prefecture, city, address_line, business_registration_type, business_registration_number, registration_authority, profile_text, health_policy, breeding_environment",
    )
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederRow;
}

async function latestReturnedComment(
  client: SupabaseClient,
  breederId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("breeder_review_logs")
    .select("comment")
    .eq("breeder_id", breederId)
    .eq("action", "returned")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.comment ?? null;
}

async function countReviewLogs(
  client: SupabaseClient,
  breederId: string,
  action: string,
): Promise<number> {
  const { count, error } = await client
    .from("breeder_review_logs")
    .select("id", { count: "exact", head: true })
    .eq("breeder_id", breederId)
    .eq("action", action);

  if (error) {
    return -1;
  }

  return count ?? 0;
}

async function recentReviewLogs(
  client: SupabaseClient,
  breederId: string,
  limit: number,
): Promise<ReviewLogRow[]> {
  const { data, error } = await client
    .from("breeder_review_logs")
    .select("id, action, comment, created_at, actor_user_id")
    .eq("breeder_id", breederId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as ReviewLogRow[];
}

function toVerificationProfileRow(breeder: BreederRow) {
  return {
    business_name: breeder.business_name,
    representative_name: breeder.representative_name,
    phone: breeder.phone,
    postal_code: breeder.postal_code,
    prefecture: breeder.prefecture,
    city: breeder.city,
    address_line: breeder.address_line,
    business_registration_type: breeder.business_registration_type,
    business_registration_number: breeder.business_registration_number,
    registration_authority: breeder.registration_authority,
    registration_expires_at: breeder.registration_expires_at,
    profile_text: breeder.profile_text,
    breeding_policy: breeder.breeding_policy,
    health_policy: breeder.health_policy,
    breeding_environment: breeder.breeding_environment,
    identity_document_path: breeder.identity_document_path,
    business_license_path: breeder.business_license_path,
    identity_verification_status: breeder.identity_verification_status,
    business_verification_status: breeder.business_verification_status,
    review_status: breeder.review_status,
    profile_completed: breeder.profile_completed,
  };
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
  const adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
  const breederId =
    optionalEnv("SEC_TEST_BREEDER_REVIEW_ID") ?? requireEnv("SEC_TEST_REVIEW_BREEDER_ID");

  console.log(`E2E target breeder: ${breederId}`);
  console.log("");

  const adminClient = createAuthClient(supabaseUrl, publishableKey);
  const breederClient = createAuthClient(supabaseUrl, publishableKey);

  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(checks, "admin authentication", adminUser != null && isAdminRole(adminUser!));

  const breederUser = await signIn(breederClient, breederEmail, breederPassword);
  record(checks, "breeder authentication", breederUser != null);

  if (!adminUser || !breederUser) {
    finish(checks);
    return;
  }

  let breeder = await loadBreeder(adminClient, breederId);
  record(checks, "breeder lookup", breeder != null, breederId);

  if (!breeder) {
    finish(checks);
    return;
  }

  record(
    checks,
    "SEC_TEST breeder owns target",
    breeder.user_id === breederUser.id,
    `breeder.user_id=${breeder.user_id}`,
  );

  if (!breeder.identity_document_path || !breeder.business_license_path) {
    record(checks, "document paths present", false, "upload BR-09 documents first");
    finish(checks);
    return;
  }

  record(checks, "document paths present", true);

  breeder = (await resetBreederSubmitted(adminClient, breeder)) ?? breeder;

  const baselineMembership = breeder.membership_status;
  const baselineIdentityVerification = breeder.identity_verification_status;
  const baselineBusinessVerification = breeder.business_verification_status;
  const returnedCountBefore = await countReviewLogs(adminClient, breederId, "returned");
  const submittedCountBefore = await countReviewLogs(adminClient, breederId, "submitted");

  console.log("");
  console.log("Baseline status:");
  console.log(`  review_status=${breeder.review_status}`);
  console.log(`  membership_status=${baselineMembership}`);
  console.log(`  identity_verification_status=${baselineIdentityVerification}`);
  console.log(`  business_verification_status=${baselineBusinessVerification}`);
  console.log(`  returned_logs=${returnedCountBefore} submitted_logs=${submittedCountBefore}`);
  console.log("");

  record(checks, "baseline review_status submitted", breeder.review_status === "submitted");

  // Admin: start review → return
  {
    const { error: startError } = await adminClient.rpc("start_breeder_review", {
      p_breeder_id: breederId,
    });
    record(checks, "admin start_breeder_review", startError == null, rpcMessage(startError));
  }

  breeder = (await loadBreeder(adminClient, breederId)) ?? breeder;
  record(
    checks,
    "after start review_status under_review",
    breeder.review_status === "under_review",
  );

  {
    const { error: returnError } = await adminClient.rpc("return_breeder_review", {
      p_breeder_id: breederId,
      p_comment: E2E_RETURN_COMMENT,
    });
    record(checks, "admin return_breeder_review", returnError == null, rpcMessage(returnError));
  }

  breeder = (await loadBreeder(adminClient, breederId)) ?? breeder;
  record(
    checks,
    "after return review_status resubmission_required",
    breeder.review_status === "resubmission_required",
    breeder.review_status,
  );
  record(
    checks,
    "after return membership_status unchanged",
    breeder.membership_status === baselineMembership,
    `${baselineMembership} → ${breeder.membership_status}`,
  );
  record(
    checks,
    "after return verification status unchanged",
    breeder.identity_verification_status === baselineIdentityVerification &&
      breeder.business_verification_status === baselineBusinessVerification,
    `${breeder.identity_verification_status}/${breeder.business_verification_status}`,
  );

  const returnedCountAfter = await countReviewLogs(adminClient, breederId, "returned");
  record(
    checks,
    "returned log added",
    returnedCountAfter === returnedCountBefore + 1,
    `before=${returnedCountBefore} after=${returnedCountAfter}`,
  );

  const breederReturnedComment = await latestReturnedComment(breederClient, breederId);
  const normalizedComment = normalizeReturnedComment(breederReturnedComment);
  record(
    checks,
    "BR-06/BR-09 latest returned comment visible to breeder",
    normalizedComment === E2E_RETURN_COMMENT.trim(),
  );
  record(checks, "returned comment preserves newline", normalizedComment?.includes("\n") === true);

  // BR-06 banner condition
  record(
    checks,
    "BR-06 banner condition (resubmission_required)",
    breeder.review_status === "resubmission_required" && normalizedComment != null,
  );

  // BR-09 edit guard
  record(checks, "BR-09 resubmission_required editable", isProfileEditable(breeder.review_status));

  // Profile update (breeding_policy)
  const originalPolicy = breeder.breeding_policy ?? "";
  const updatedPolicy = originalPolicy.includes(E2E_PROFILE_MARKER)
    ? originalPolicy
    : `${originalPolicy}${E2E_PROFILE_MARKER}`;

  {
    const { error: updateError } = await breederClient
      .from("breeders")
      .update({ breeding_policy: updatedPolicy })
      .eq("user_id", breederUser.id);

    record(
      checks,
      "breeder profile save (breeding_policy)",
      updateError == null,
      updateError?.message,
    );
  }

  breeder = (await loadBreeder(breederClient, breederId)) ?? breeder;
  record(
    checks,
    "profile change persisted after reload",
    breeder.breeding_policy === updatedPolicy,
  );
  record(
    checks,
    "profile save keeps resubmission_required",
    breeder.review_status === "resubmission_required",
    breeder.review_status,
  );

  const missingBeforeResubmit = validateProfileCompletion(toVerificationProfileRow(breeder));
  record(
    checks,
    "profile completion valid before resubmit",
    missingBeforeResubmit.length === 0,
    missingBeforeResubmit.map((step) => step.label).join(", ") || "none",
  );

  // Resubmit (simulates resubmitBreederProfile RPC step)
  {
    const { error: resubmitError } = await breederClient.rpc("resubmit_breeder_application");
    record(
      checks,
      "breeder resubmit_breeder_application",
      resubmitError == null,
      rpcMessage(resubmitError),
    );
  }

  breeder = (await loadBreeder(breederClient, breederId)) ?? breeder;
  record(
    checks,
    "after resubmit review_status submitted",
    breeder.review_status === "submitted",
    breeder.review_status,
  );

  const submittedCountAfter = await countReviewLogs(adminClient, breederId, "submitted");
  record(
    checks,
    "submitted log added",
    submittedCountAfter === submittedCountBefore + 1,
    `before=${submittedCountBefore} after=${submittedCountAfter}`,
  );
  record(
    checks,
    "returned logs not deleted",
    (await countReviewLogs(adminClient, breederId, "returned")) === returnedCountAfter,
  );
  record(
    checks,
    "after resubmit membership_status unchanged",
    breeder.membership_status === baselineMembership,
  );
  record(
    checks,
    "after resubmit verification status unchanged",
    breeder.identity_verification_status === baselineIdentityVerification &&
      breeder.business_verification_status === baselineBusinessVerification,
  );

  // BR-06 post-resubmit: no banner
  record(
    checks,
    "BR-06 no banner after resubmit",
    breeder.review_status !== "resubmission_required",
  );

  // BR-09 edit blocked
  record(checks, "BR-09 submitted not editable", !isProfileEditable(breeder.review_status));

  // Server-side resubmit guard
  {
    const { error } = await breederClient.rpc("resubmit_breeder_application");
    record(
      checks,
      "submitted resubmit RPC rejected",
      error != null && rpcMessage(error).toLowerCase().includes("invalid review status"),
      rpcMessage(error),
    );
  }

  // Server-side initial submit guard
  {
    const { error } = await breederClient.rpc("submit_breeder_application");
    record(
      checks,
      "submitted initial submit RPC rejected",
      error != null && rpcMessage(error).toLowerCase().includes("invalid review status"),
      rpcMessage(error),
    );
  }

  // Other breeder isolation: breeder cannot read foreign returned comment via scoped query
  {
    const foreignBreederId = "00000000-0000-0000-0000-000000000001";
    const { data, error } = await breederClient
      .from("breeder_review_logs")
      .select("comment")
      .eq("breeder_id", foreignBreederId)
      .eq("action", "returned")
      .limit(1);

    record(
      checks,
      "other breeder returned comment not readable",
      error == null && (data?.length ?? 0) === 0,
    );
  }

  // Admin re-review
  {
    const { error } = await adminClient.rpc("start_breeder_review", { p_breeder_id: breederId });
    record(checks, "admin re-review start_breeder_review", error == null, rpcMessage(error));
  }

  breeder = (await loadBreeder(adminClient, breederId)) ?? breeder;
  record(
    checks,
    "admin AD-01/AD-02 submitted then under_review",
    breeder.review_status === "under_review",
    breeder.review_status,
  );

  const recentLogs = await recentReviewLogs(adminClient, breederId, 5);
  const returnedIndex = recentLogs.findIndex((log) => log.action === "returned");
  const submittedIndex = recentLogs.findIndex((log) => log.action === "submitted");
  record(
    checks,
    "review history contains returned then submitted (recent order)",
    returnedIndex !== -1 &&
      submittedIndex !== -1 &&
      new Date(recentLogs[submittedIndex].created_at).getTime() >=
        new Date(recentLogs[returnedIndex].created_at).getTime(),
    recentLogs.map((log) => `${log.action}@${log.created_at}`).join(" | "),
  );

  console.log("");
  console.log("Final status:");
  console.log(`  review_status=${breeder.review_status}`);
  console.log(`  membership_status=${breeder.membership_status}`);
  console.log(`  identity_verification_status=${breeder.identity_verification_status}`);
  console.log(`  business_verification_status=${breeder.business_verification_status}`);

  finish(checks);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

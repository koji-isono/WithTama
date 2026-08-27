/**
 * Admin breeder review RPC security test (AD-01 / AD-02).
 *
 * Tests start_breeder_review / approve_breeder_review /
 * return_breeder_review / reject_breeder_review via authenticated JWT + .rpc().
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Requires migrations:
 *   20260825100000_create_breeder_review_logs.sql
 *   20260825110000_add_admin_breeder_documents_select_rls.sql
 *   20260825120000_create_breeder_review_admin_rpcs.sql
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_ADMIN_EMAIL
 *   SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_BREEDER_REVIEW_ID (or SEC_TEST_REVIEW_BREEDER_ID)
 *
 * Optional:
 *   SEC_TEST_BREEDER_REVIEW_RETURN_ID
 *   SEC_TEST_BREEDER_REVIEW_REJECT_ID
 *   SEC_TEST_BUYER_EMAIL / SEC_TEST_BUYER_PASSWORD (storage cross-user test)
 *
 * Usage:
 *   npm run test:breeder-review-rpcs
 *
 * Prep: npm run prepare:sec-test-breeder-review
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const RETURN_COMMENT = "SEC-TEST breeder return reason";
const REJECT_COMMENT = "SEC-TEST breeder reject reason";
const BREEDER_DOCUMENTS_BUCKET = "breeder-documents";

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
};

type ReviewLogRow = {
  action: string;
  comment: string | null;
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

function isAdminRole(user: User): boolean {
  return user.app_metadata?.role === "admin";
}

function rpcMessage(error: { message: string } | null): string {
  return error?.message ?? "";
}

function includes(message: string, fragment: string): boolean {
  return message.toLowerCase().includes(fragment.toLowerCase());
}

function futureRegistrationDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function pastRegistrationDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().slice(0, 10);
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
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

async function loadBreeder(
  supabase: SupabaseClient,
  breederId: string,
): Promise<BreederRow | null> {
  const { data, error } = await supabase
    .from("breeders")
    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at",
    )
    .eq("id", breederId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederRow;
}

async function resetBreederSubmitted(
  supabase: SupabaseClient,
  breeder: BreederRow,
): Promise<BreederRow | null> {
  const expiresAt =
    breeder.registration_expires_at &&
    breeder.registration_expires_at >= new Date().toISOString().slice(0, 10)
      ? breeder.registration_expires_at
      : futureRegistrationDate();

  const { data, error } = await supabase
    .from("breeders")
    .update({
      review_status: "submitted",
      identity_verification_status: "submitted",
      business_verification_status: "submitted",
      approved_at: null,
      registration_expires_at: expiresAt,
      identity_document_path: breeder.identity_document_path,
      business_license_path: breeder.business_license_path,
    })
    .eq("id", breeder.id)
    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at",
    )
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederRow;
}

async function setBreederUnderReview(
  supabase: SupabaseClient,
  breederId: string,
  patch: Partial<BreederRow> = {},
): Promise<BreederRow | null> {
  const { data, error } = await supabase
    .from("breeders")
    .update({
      review_status: "under_review",
      ...patch,
    })
    .eq("id", breederId)
    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at",
    )
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederRow;
}

async function latestReviewLog(
  supabase: SupabaseClient,
  breederId: string,
  action: string,
): Promise<ReviewLogRow | null> {
  const { data, error } = await supabase
    .from("breeder_review_logs")
    .select("action, comment, actor_user_id")
    .eq("breeder_id", breederId)
    .eq("action", action)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ReviewLogRow;
}

async function checkMigrationApplied(
  adminClient: SupabaseClient,
  checks: Check[],
): Promise<boolean> {
  const { error } = await adminClient.rpc("start_breeder_review", {
    p_breeder_id: "00000000-0000-0000-0000-000000000000",
  });

  const message = rpcMessage(error);

  if (includes(message, "could not find the function") || includes(message, "schema cache")) {
    record(
      checks,
      "migrations applied (RPC exists)",
      false,
      "apply 20260825100000 / 20260825110000 / 20260825120000 before running this test",
    );
    return false;
  }

  record(checks, "migrations applied (RPC exists)", true);
  return true;
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;
  let publishableKey: string;
  let adminEmail: string;
  let adminPassword: string;
  let breederEmail: string;
  let breederPassword: string;
  let primaryBreederId: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
    adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
    breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
    breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
    primaryBreederId =
      optionalEnv("SEC_TEST_BREEDER_REVIEW_ID") ?? requireEnv("SEC_TEST_REVIEW_BREEDER_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    console.log(`FAIL environment (${message})`);
    finish(checks);
    return;
  }

  const returnBreederId = optionalEnv("SEC_TEST_BREEDER_REVIEW_RETURN_ID") ?? primaryBreederId;
  const rejectBreederId = optionalEnv("SEC_TEST_BREEDER_REVIEW_REJECT_ID") ?? primaryBreederId;

  const adminClient = createAnonClient(supabaseUrl, publishableKey);
  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(checks, "admin authentication", adminUser != null);
  record(checks, "admin role", adminUser != null && isAdminRole(adminUser));

  if (!adminUser || !isAdminRole(adminUser)) {
    finish(checks);
    return;
  }

  if (!(await checkMigrationApplied(adminClient, checks))) {
    finish(checks);
    return;
  }

  let primary = await loadBreeder(adminClient, primaryBreederId);
  record(checks, "primary breeder lookup", primary != null);

  if (!primary?.identity_document_path || !primary.business_license_path) {
    record(
      checks,
      "primary breeder document paths",
      false,
      "run prepare:sec-test-breeder-review after uploading BR-09 documents",
    );
    finish(checks);
    return;
  }

  record(checks, "primary breeder document paths", true);

  primary = await resetBreederSubmitted(adminClient, primary);
  record(checks, "primary breeder reset submitted", primary != null);

  if (!primary) {
    finish(checks);
    return;
  }

  const membershipBefore = primary.membership_status;
  const identityPath = primary.identity_document_path;
  const licensePath = primary.business_license_path;
  const validExpires = primary.registration_expires_at ?? futureRegistrationDate();

  const breederClient = createAnonClient(supabaseUrl, publishableKey);
  const breederUser = await signIn(breederClient, breederEmail, breederPassword);
  record(checks, "breeder authentication", breederUser != null);

  // 1. non-admin → start拒否
  {
    const { error } = await breederClient.rpc("start_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    record(
      checks,
      "1 non-admin cannot start_breeder_review",
      includes(rpcMessage(error), "admin required"),
    );
  }

  // 4. submittedのままapprove → 拒否
  {
    const { error } = await adminClient.rpc("approve_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    record(
      checks,
      "4 approve while submitted rejected",
      error != null && includes(rpcMessage(error), "invalid review status"),
    );
  }

  // 2. submitted → under_review 成功
  {
    const { error } = await adminClient.rpc("start_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    record(checks, "2 start_breeder_review success", error == null, rpcMessage(error));
  }

  primary = await loadBreeder(adminClient, primaryBreederId);
  record(
    checks,
    "2 review_status under_review",
    primary?.review_status === "under_review",
    primary?.review_status,
  );

  // 3. review_started log
  {
    const log = await latestReviewLog(adminClient, primaryBreederId, "review_started");
    record(
      checks,
      "3 review_started log recorded",
      log != null && log.actor_user_id === adminUser.id,
    );
  }

  // 9. 登録期限切れ → approve拒否
  {
    await setBreederUnderReview(adminClient, primaryBreederId, {
      registration_expires_at: pastRegistrationDate(),
      identity_document_path: identityPath,
      business_license_path: licensePath,
    });
    const { error } = await adminClient.rpc("approve_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    record(
      checks,
      "9 expired registration approve rejected",
      error != null && includes(rpcMessage(error), "breeder not eligible for approval"),
    );
  }

  // 10. registration_expires_at NULL → approve拒否
  {
    await setBreederUnderReview(adminClient, primaryBreederId, {
      registration_expires_at: null,
      identity_document_path: identityPath,
      business_license_path: licensePath,
    });
    const { error } = await adminClient.rpc("approve_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    record(
      checks,
      "10 null registration_expires_at approve rejected",
      error != null && includes(rpcMessage(error), "breeder not eligible for approval"),
    );
  }

  // 11. identity_document_pathなし → approve拒否
  {
    await setBreederUnderReview(adminClient, primaryBreederId, {
      registration_expires_at: validExpires,
      identity_document_path: null,
      business_license_path: licensePath,
    });
    const { error } = await adminClient.rpc("approve_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    record(
      checks,
      "11 missing identity_document_path approve rejected",
      error != null && includes(rpcMessage(error), "breeder not eligible for approval"),
    );
  }

  // 12. business_license_pathなし → approve拒否
  {
    await setBreederUnderReview(adminClient, primaryBreederId, {
      registration_expires_at: validExpires,
      identity_document_path: identityPath,
      business_license_path: null,
    });
    const { error } = await adminClient.rpc("approve_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    record(
      checks,
      "12 missing business_license_path approve rejected",
      error != null && includes(rpcMessage(error), "breeder not eligible for approval"),
    );
  }

  // Restore eligible under_review for approve success
  await setBreederUnderReview(adminClient, primaryBreederId, {
    registration_expires_at: validExpires,
    identity_document_path: identityPath,
    business_license_path: licensePath,
    identity_verification_status: "submitted",
    business_verification_status: "submitted",
  });

  // 5. under_review → approve成功
  {
    const { error } = await adminClient.rpc("approve_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    record(checks, "5 approve_breeder_review success", error == null, rpcMessage(error));
  }

  primary = await loadBreeder(adminClient, primaryBreederId);

  // 6. verification both verified
  record(
    checks,
    "6 identity and business verification verified",
    primary?.identity_verification_status === "verified" &&
      primary?.business_verification_status === "verified",
    `${primary?.identity_verification_status}/${primary?.business_verification_status}`,
  );

  // 7. approved_at set
  record(checks, "7 approved_at set", primary?.approved_at != null);

  // 8. membership_status unchanged
  record(
    checks,
    "8 membership_status unchanged on approve",
    primary?.membership_status === membershipBefore,
    `before=${membershipBefore} after=${primary?.membership_status}`,
  );

  // Return flow on returnBreederId
  let returnBreeder = await loadBreeder(adminClient, returnBreederId);
  if (returnBreeder) {
    returnBreeder = await resetBreederSubmitted(adminClient, returnBreeder);
  }

  if (returnBreeder) {
    await adminClient.rpc("start_breeder_review", { p_breeder_id: returnBreederId });

    // 13. return commentなし
    {
      const { error } = await adminClient.rpc("return_breeder_review", {
        p_breeder_id: returnBreederId,
        p_comment: "",
      });
      record(
        checks,
        "13 return without comment rejected",
        error != null && includes(rpcMessage(error), "return comment required"),
      );
    }

    // 14. return 空白のみ
    {
      const { error } = await adminClient.rpc("return_breeder_review", {
        p_breeder_id: returnBreederId,
        p_comment: "   ",
      });
      record(
        checks,
        "14 return whitespace-only comment rejected",
        error != null && includes(rpcMessage(error), "return comment required"),
      );
    }

    // 15. return success
    {
      const { error } = await adminClient.rpc("return_breeder_review", {
        p_breeder_id: returnBreederId,
        p_comment: RETURN_COMMENT,
      });
      record(checks, "15 return_breeder_review success", error == null, rpcMessage(error));
    }

    returnBreeder = await loadBreeder(adminClient, returnBreederId);
    record(
      checks,
      "15 review_status resubmission_required",
      returnBreeder?.review_status === "resubmission_required",
      returnBreeder?.review_status,
    );

    record(
      checks,
      "15 verification status unchanged on return",
      returnBreeder?.identity_verification_status === "submitted" &&
        returnBreeder?.business_verification_status === "submitted",
    );

    // 16. returned log + comment
    {
      const log = await latestReviewLog(adminClient, returnBreederId, "returned");
      record(
        checks,
        "16 returned log with comment",
        log != null && log.comment === RETURN_COMMENT && log.actor_user_id === adminUser.id,
      );
    }
  } else {
    record(checks, "return breeder setup", false, "could not reset return breeder");
  }

  // Reject flow
  let rejectBreeder = await loadBreeder(adminClient, rejectBreederId);
  if (rejectBreeder) {
    rejectBreeder = await resetBreederSubmitted(adminClient, rejectBreeder);
  }

  if (rejectBreeder) {
    await adminClient.rpc("start_breeder_review", { p_breeder_id: rejectBreederId });

    // 17. reject commentなし
    {
      const { error } = await adminClient.rpc("reject_breeder_review", {
        p_breeder_id: rejectBreederId,
        p_comment: "",
      });
      record(
        checks,
        "17 reject without comment rejected",
        error != null && includes(rpcMessage(error), "reject comment required"),
      );
    }

    // 18. reject success
    {
      const { error } = await adminClient.rpc("reject_breeder_review", {
        p_breeder_id: rejectBreederId,
        p_comment: REJECT_COMMENT,
      });
      record(checks, "18 reject_breeder_review success", error == null, rpcMessage(error));
    }

    rejectBreeder = await loadBreeder(adminClient, rejectBreederId);
    record(
      checks,
      "18 review_status rejected",
      rejectBreeder?.review_status === "rejected",
      rejectBreeder?.review_status,
    );

    record(
      checks,
      "18 verification status unchanged on reject",
      rejectBreeder?.identity_verification_status === "submitted" &&
        rejectBreeder?.business_verification_status === "submitted",
    );

    // 19. rejected log + comment
    {
      const log = await latestReviewLog(adminClient, rejectBreederId, "rejected");
      record(
        checks,
        "19 rejected log with comment",
        log != null && log.comment === REJECT_COMMENT && log.actor_user_id === adminUser.id,
      );
    }
  } else {
    record(checks, "reject breeder setup", false, "could not reset reject breeder");
  }

  // 20. buyer / breeder本人からadmin RPC拒否
  if (breederUser) {
    const { error: startError } = await breederClient.rpc("start_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    const { error: approveError } = await breederClient.rpc("approve_breeder_review", {
      p_breeder_id: primaryBreederId,
    });
    const { error: returnError } = await breederClient.rpc("return_breeder_review", {
      p_breeder_id: primaryBreederId,
      p_comment: RETURN_COMMENT,
    });
    const { error: rejectError } = await breederClient.rpc("reject_breeder_review", {
      p_breeder_id: primaryBreederId,
      p_comment: REJECT_COMMENT,
    });

    record(
      checks,
      "20 breeder cannot call admin review RPCs",
      [startError, approveError, returnError, rejectError].every((error) =>
        includes(rpcMessage(error), "admin required"),
      ),
    );
  } else {
    record(checks, "20 breeder cannot call admin review RPCs", false, "breeder sign-in failed");
  }

  const buyerEmail = optionalEnv("SEC_TEST_BUYER_EMAIL");
  const buyerPassword = optionalEnv("SEC_TEST_BUYER_PASSWORD");

  if (buyerEmail && buyerPassword) {
    const buyerClient = createAnonClient(supabaseUrl, publishableKey);
    const buyerUser = await signIn(buyerClient, buyerEmail, buyerPassword);

    if (buyerUser) {
      const { error: startError } = await buyerClient.rpc("start_breeder_review", {
        p_breeder_id: primaryBreederId,
      });
      const { error: approveError } = await buyerClient.rpc("approve_breeder_review", {
        p_breeder_id: primaryBreederId,
      });

      record(
        checks,
        "20 buyer cannot call admin review RPCs",
        [startError, approveError].every((error) => includes(rpcMessage(error), "admin required")),
      );
    } else {
      record(checks, "20 buyer cannot call admin review RPCs", false, "buyer sign-in failed");
    }
  } else {
    record(
      checks,
      "20 buyer cannot call admin review RPCs",
      false,
      "SEC_TEST_BUYER_EMAIL/PASSWORD unset — skipped",
    );
  }

  // 21–22. Storage RLS
  if (identityPath) {
    const { error: adminDownloadError } = await adminClient.storage
      .from(BREEDER_DOCUMENTS_BUCKET)
      .download(identityPath);

    record(
      checks,
      "21 admin can SELECT breeder-documents",
      adminDownloadError == null,
      adminDownloadError?.message,
    );

    const buyerEmail = optionalEnv("SEC_TEST_BUYER_EMAIL");
    const buyerPassword = optionalEnv("SEC_TEST_BUYER_PASSWORD");

    if (buyerEmail && buyerPassword) {
      const buyerClient = createAnonClient(supabaseUrl, publishableKey);
      const buyerUser = await signIn(buyerClient, buyerEmail, buyerPassword);

      if (buyerUser) {
        const { error: buyerDownloadError } = await buyerClient.storage
          .from(BREEDER_DOCUMENTS_BUCKET)
          .download(identityPath);

        record(
          checks,
          "22 buyer cannot SELECT others breeder-documents",
          buyerDownloadError != null,
          buyerDownloadError?.message ?? "unexpected download success",
        );
      } else {
        record(
          checks,
          "22 buyer cannot SELECT others breeder-documents",
          false,
          "buyer sign-in failed",
        );
      }
    } else {
      record(
        checks,
        "22 buyer cannot SELECT others breeder-documents",
        false,
        "SEC_TEST_BUYER_EMAIL/PASSWORD unset — skipped",
      );
    }
  } else {
    record(checks, "21 admin can SELECT breeder-documents", false, "no identity path");
    record(checks, "22 buyer cannot SELECT others breeder-documents", false, "no identity path");
  }

  const cleanupBreeder = await loadBreeder(adminClient, primaryBreederId);
  if (cleanupBreeder) {
    const cleaned = await resetBreederSubmitted(adminClient, cleanupBreeder);
    const cleanupOk =
      cleaned?.review_status === "submitted" &&
      cleaned?.identity_verification_status === "submitted" &&
      cleaned?.business_verification_status === "submitted" &&
      cleaned.membership_status === cleanupBreeder.membership_status;
    record(
      checks,
      "cleanup reset to submitted",
      cleanupOk,
      cleaned?.review_status ?? "reset failed",
    );
  } else {
    record(checks, "cleanup reset to submitted", false, "breeder not found");
  }

  finish(checks);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

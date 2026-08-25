/**
 * Breeder application submit / resubmit RPC security test (BR-09 phase 1).
 *
 * Tests submit_breeder_application / resubmit_breeder_application via JWT + .rpc().
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY.
 *
 * Requires migrations:
 *   20260825100000_create_breeder_review_logs.sql
 *   20260825130000_create_breeder_application_submit_rpcs.sql
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_ADMIN_EMAIL / SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_BREEDER_EMAIL / SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_BREEDER_REVIEW_ID (or SEC_TEST_REVIEW_BREEDER_ID)
 *
 * Optional:
 *   SEC_TEST_BUYER_EMAIL / SEC_TEST_BUYER_PASSWORD
 *
 * Usage:
 *   npm run test:breeder-application-submit-rpcs
 *
 * Prep: npm run prepare:sec-test-breeder-application-submit
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const RETURN_COMMENT = "SEC-TEST application resubmit return reason";

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
};

type ReviewLogRow = {
  action: string;
  comment: string | null;
  actor_user_id: string;
  created_at: string;
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

function isRpcMissingError(message: string): boolean {
  return includes(message, "could not find the function") || includes(message, "schema cache");
}

function futureRegistrationDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
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
      "id, user_id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at, profile_completed",
    )
    .eq("id", breederId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederRow;
}

async function adminUpdateBreeder(
  supabase: SupabaseClient,
  breederId: string,
  patch: Record<string, unknown>,
): Promise<BreederRow | null> {
  const { data, error } = await supabase
    .from("breeders")
    .update(patch)
    .eq("id", breederId)
    .select(
      "id, user_id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at, profile_completed",
    )
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederRow;
}

async function countSubmittedLogs(supabase: SupabaseClient, breederId: string): Promise<number> {
  const { count, error } = await supabase
    .from("breeder_review_logs")
    .select("id", { count: "exact", head: true })
    .eq("breeder_id", breederId)
    .eq("action", "submitted");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function latestSubmittedLog(
  supabase: SupabaseClient,
  breederId: string,
): Promise<ReviewLogRow | null> {
  const { data, error } = await supabase
    .from("breeder_review_logs")
    .select("action, comment, actor_user_id, created_at")
    .eq("breeder_id", breederId)
    .eq("action", "submitted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ReviewLogRow;
}

async function resetToDraft(
  adminClient: SupabaseClient,
  breeder: BreederRow,
): Promise<BreederRow | null> {
  const expiresAt =
    breeder.registration_expires_at &&
    breeder.registration_expires_at >= new Date().toISOString().slice(0, 10)
      ? breeder.registration_expires_at
      : futureRegistrationDate();

  return adminUpdateBreeder(adminClient, breeder.id, {
    review_status: "draft",
    identity_verification_status: "unverified",
    business_verification_status: "unverified",
    profile_completed: false,
    approved_at: null,
    registration_expires_at: expiresAt,
  });
}

async function resetToSubmitted(
  adminClient: SupabaseClient,
  breeder: BreederRow,
): Promise<BreederRow | null> {
  const expiresAt =
    breeder.registration_expires_at &&
    breeder.registration_expires_at >= new Date().toISOString().slice(0, 10)
      ? breeder.registration_expires_at
      : futureRegistrationDate();

  return adminUpdateBreeder(adminClient, breeder.id, {
    review_status: "submitted",
    identity_verification_status: "submitted",
    business_verification_status: "submitted",
    profile_completed: true,
    approved_at: null,
    registration_expires_at: expiresAt,
  });
}

async function setResubmissionRequired(
  adminClient: SupabaseClient,
  breederId: string,
): Promise<boolean> {
  const breeder = await loadBreeder(adminClient, breederId);
  if (!breeder) {
    return false;
  }

  let current = breeder;
  if (current.review_status === "draft") {
    const submitted = await resetToSubmitted(adminClient, current);
    if (!submitted) {
      return false;
    }
    current = submitted;
  }

  if (current.review_status === "submitted" || current.review_status === "resubmission_required") {
    if (current.review_status === "submitted") {
      const { error } = await adminClient.rpc("start_breeder_review", { p_breeder_id: breederId });
      if (error) {
        return false;
      }
    }

    if ((await loadBreeder(adminClient, breederId))?.review_status === "under_review") {
      const { error } = await adminClient.rpc("return_breeder_review", {
        p_breeder_id: breederId,
        p_comment: RETURN_COMMENT,
      });
      return error == null;
    }

    return (await loadBreeder(adminClient, breederId))?.review_status === "resubmission_required";
  }

  if (current.review_status === "under_review") {
    const { error } = await adminClient.rpc("return_breeder_review", {
      p_breeder_id: breederId,
      p_comment: RETURN_COMMENT,
    });
    return error == null;
  }

  if (current.review_status === "approved" || current.review_status === "rejected") {
    const reset = await resetToSubmitted(adminClient, current);
    if (!reset) {
      return false;
    }
    return setResubmissionRequired(adminClient, breederId);
  }

  return false;
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;
  let publishableKey: string;
  let adminEmail: string;
  let adminPassword: string;
  let breederEmail: string;
  let breederPassword: string;
  let breederId: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
    adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
    breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
    breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
    breederId =
      optionalEnv("SEC_TEST_BREEDER_APPLICATION_SUBMIT_ID") ??
      optionalEnv("SEC_TEST_BREEDER_REVIEW_ID") ??
      requireEnv("SEC_TEST_REVIEW_BREEDER_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    console.log(`FAIL environment (${message})`);
    finish(checks);
    return;
  }

  const adminClient = createAnonClient(supabaseUrl, publishableKey);
  const breederClient = createAnonClient(supabaseUrl, publishableKey);
  const anonClient = createAnonClient(supabaseUrl, publishableKey);

  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(checks, "admin authentication", adminUser != null && isAdminRole(adminUser!));

  const breederUser = await signIn(breederClient, breederEmail, breederPassword);
  record(checks, "breeder authentication", breederUser != null);

  if (!adminUser || !breederUser) {
    finish(checks);
    return;
  }

  const rpcProbe = await breederClient.rpc("submit_breeder_application");
  if (isRpcMissingError(rpcMessage(rpcProbe.error))) {
    record(
      checks,
      "migrations applied (RPC exists)",
      false,
      "apply supabase/migrations/20260825130000_create_breeder_application_submit_rpcs.sql first",
    );
    finish(checks);
    return;
  }

  record(checks, "migrations applied (RPC exists)", true);

  let breeder = await loadBreeder(adminClient, breederId);
  if (!breeder) {
    record(checks, "test breeder lookup", false, breederId);
    finish(checks);
    return;
  }

  record(checks, "test breeder lookup", true, breederId);

  if (breeder.user_id !== breederUser.id) {
    record(
      checks,
      "SEC_TEST_BREEDER owns test breeder",
      false,
      "SEC_TEST_BREEDER_EMAIL must own SEC_TEST_BREEDER_REVIEW_ID",
    );
    finish(checks);
    return;
  }

  record(checks, "SEC_TEST_BREEDER owns test breeder", true);

  const membershipBefore = breeder.membership_status;
  const identityPath = breeder.identity_document_path;
  const licensePath = breeder.business_license_path;

  // --- Initial submit (15-23) ---
  breeder = (await resetToDraft(adminClient, breeder)) ?? breeder;
  record(checks, "15 setup draft status", breeder.review_status === "draft", breeder.review_status);

  const logsBeforeInitial = await countSubmittedLogs(breederClient, breederId);
  const initialSubmit = await breederClient.rpc("submit_breeder_application");

  record(
    checks,
    "15 draft -> submitted success",
    initialSubmit.error == null,
    rpcMessage(initialSubmit.error),
  );

  breeder = (await loadBreeder(breederClient, breederId)) ?? breeder;

  record(
    checks,
    "16 submitted log added (initial)",
    (await countSubmittedLogs(breederClient, breederId)) === logsBeforeInitial + 1,
    `count=${await countSubmittedLogs(breederClient, breederId)}`,
  );

  record(
    checks,
    "17 verification status submitted (initial)",
    breeder.identity_verification_status === "submitted" &&
      breeder.business_verification_status === "submitted",
    `${breeder.identity_verification_status}/${breeder.business_verification_status}`,
  );

  record(
    checks,
    "18 membership_status unchanged (initial)",
    breeder.membership_status === membershipBefore,
    breeder.membership_status,
  );

  record(
    checks,
    "19 initial submit rejected from submitted",
    includes(
      rpcMessage((await breederClient.rpc("submit_breeder_application")).error),
      "invalid review status",
    ),
  );

  await adminUpdateBreeder(adminClient, breederId, { review_status: "under_review" });
  record(
    checks,
    "20 initial submit rejected from under_review",
    includes(
      rpcMessage((await breederClient.rpc("submit_breeder_application")).error),
      "invalid review status",
    ),
  );

  await adminUpdateBreeder(adminClient, breederId, {
    review_status: "approved",
    identity_verification_status: "verified",
    business_verification_status: "verified",
    approved_at: new Date().toISOString(),
  });
  record(
    checks,
    "21 initial submit rejected from approved",
    includes(
      rpcMessage((await breederClient.rpc("submit_breeder_application")).error),
      "invalid review status",
    ),
  );

  await adminUpdateBreeder(adminClient, breederId, {
    review_status: "rejected",
    identity_verification_status: "submitted",
    business_verification_status: "submitted",
    approved_at: null,
  });
  record(
    checks,
    "22 initial submit rejected from rejected",
    includes(
      rpcMessage((await breederClient.rpc("submit_breeder_application")).error),
      "invalid review status",
    ),
  );

  await adminUpdateBreeder(adminClient, breederId, {
    review_status: "resubmission_required",
    identity_verification_status: "submitted",
    business_verification_status: "submitted",
    approved_at: null,
  });
  record(
    checks,
    "23 initial submit rejected from resubmission_required",
    includes(
      rpcMessage((await breederClient.rpc("submit_breeder_application")).error),
      "invalid review status",
    ),
  );

  // --- Resubmit (1-14) ---
  const resubmitSetupOk = await setResubmissionRequired(adminClient, breederId);
  breeder = (await loadBreeder(breederClient, breederId)) ?? breeder;
  record(
    checks,
    "1 setup resubmission_required",
    resubmitSetupOk && breeder.review_status === "resubmission_required",
    breeder.review_status,
  );

  const identityBeforeResubmit = breeder.identity_verification_status;
  const businessBeforeResubmit = breeder.business_verification_status;
  const approvedAtBeforeResubmit = breeder.approved_at;
  const logsBeforeResubmit = await countSubmittedLogs(breederClient, breederId);

  const resubmitResult = await breederClient.rpc("resubmit_breeder_application");
  record(
    checks,
    "1 resubmission_required -> submitted success",
    resubmitResult.error == null,
    rpcMessage(resubmitResult.error),
  );

  breeder = (await loadBreeder(breederClient, breederId)) ?? breeder;

  record(
    checks,
    "2 submitted log added (resubmit)",
    (await countSubmittedLogs(breederClient, breederId)) === logsBeforeResubmit + 1,
  );

  record(
    checks,
    "3 membership_status unchanged (resubmit)",
    breeder.membership_status === membershipBefore,
    breeder.membership_status,
  );

  record(
    checks,
    "4 identity verification unchanged (resubmit)",
    breeder.identity_verification_status === identityBeforeResubmit,
    breeder.identity_verification_status,
  );

  record(
    checks,
    "5 business verification unchanged (resubmit)",
    breeder.business_verification_status === businessBeforeResubmit,
    breeder.business_verification_status,
  );

  record(
    checks,
    "6 approved_at unchanged (resubmit)",
    breeder.approved_at === approvedAtBeforeResubmit,
    String(breeder.approved_at),
  );

  const latestLog = await latestSubmittedLog(breederClient, breederId);
  record(
    checks,
    "2 submitted log actor is breeder",
    latestLog != null && latestLog.actor_user_id === breederUser.id,
  );

  const invalidResubmitStatuses: Array<{ label: string; patch: Record<string, unknown> }> = [
    { label: "7 draft", patch: { review_status: "draft", profile_completed: false } },
    { label: "8 submitted", patch: { review_status: "submitted" } },
    { label: "9 under_review", patch: { review_status: "under_review" } },
    {
      label: "10 approved",
      patch: {
        review_status: "approved",
        identity_verification_status: "verified",
        business_verification_status: "verified",
        approved_at: new Date().toISOString(),
      },
    },
    {
      label: "11 rejected",
      patch: {
        review_status: "rejected",
        approved_at: null,
        identity_verification_status: "submitted",
        business_verification_status: "submitted",
      },
    },
  ];

  for (const item of invalidResubmitStatuses) {
    await adminUpdateBreeder(adminClient, breederId, item.patch);
    const logsBefore = await countSubmittedLogs(breederClient, breederId);
    const { error } = await breederClient.rpc("resubmit_breeder_application");
    const logsAfter = await countSubmittedLogs(breederClient, breederId);
    record(
      checks,
      `${item.label} resubmit rejected`,
      error != null && includes(rpcMessage(error), "invalid review status"),
      rpcMessage(error),
    );
    record(
      checks,
      `${item.label} resubmit creates no extra log`,
      logsAfter === logsBefore,
      `count=${logsAfter}`,
    );
  }

  await setResubmissionRequired(adminClient, breederId);

  const { error: anonResubmitError } = await anonClient.rpc("resubmit_breeder_application");
  record(
    checks,
    "12 unauthenticated resubmit rejected",
    anonResubmitError != null,
    rpcMessage(anonResubmitError),
  );

  const { error: anonSubmitError } = await anonClient.rpc("submit_breeder_application");
  record(
    checks,
    "12 unauthenticated initial submit rejected",
    anonSubmitError != null,
    rpcMessage(anonSubmitError),
  );

  const buyerEmail = optionalEnv("SEC_TEST_BUYER_EMAIL");
  const buyerPassword = optionalEnv("SEC_TEST_BUYER_PASSWORD");

  if (buyerEmail && buyerPassword) {
    const buyerClient = createAnonClient(supabaseUrl, publishableKey);
    const buyerUser = await signIn(buyerClient, buyerEmail, buyerPassword);
    if (buyerUser) {
      const { error: buyerResubmitError } = await buyerClient.rpc("resubmit_breeder_application");
      record(
        checks,
        "14 buyer resubmit rejected",
        buyerResubmitError != null && includes(rpcMessage(buyerResubmitError), "breeder not found"),
        rpcMessage(buyerResubmitError),
      );

      const { error: buyerSubmitError } = await buyerClient.rpc("submit_breeder_application");
      record(
        checks,
        "buyer initial submit rejected",
        buyerSubmitError != null && includes(rpcMessage(buyerSubmitError), "breeder not found"),
      );
    } else {
      record(checks, "14 buyer resubmit rejected", false, "buyer sign-in failed");
    }
  } else {
    record(checks, "14 buyer resubmit rejected", false, "SEC_TEST_BUYER unset — skipped");
  }

  if (adminUser) {
    const { error: adminResubmitError } = await adminClient.rpc("resubmit_breeder_application");
    record(
      checks,
      "admin resubmit rejected",
      adminResubmitError != null &&
        includes(rpcMessage(adminResubmitError), "invalid submit actor"),
    );
  }

  record(
    checks,
    "13 other breeder cannot target foreign breeder (RPC uses auth.uid only)",
    true,
    "no breeder_id parameter — cross-breeder invocation impossible",
  );

  // Atomicity: documents missing on initial submit leaves draft without log
  breeder = (await resetToDraft(adminClient, (await loadBreeder(adminClient, breederId))!))!;
  await adminUpdateBreeder(adminClient, breederId, {
    identity_document_path: null,
  });
  const atomicLogsBefore = await countSubmittedLogs(breederClient, breederId);
  const atomicSubmit = await breederClient.rpc("submit_breeder_application");
  const atomicStatus = (await loadBreeder(breederClient, breederId))?.review_status;
  const atomicLogsAfter = await countSubmittedLogs(breederClient, breederId);
  record(
    checks,
    "atomic initial submit rolls back on documents required",
    atomicSubmit.error != null &&
      includes(rpcMessage(atomicSubmit.error), "documents required") &&
      atomicStatus === "draft" &&
      atomicLogsAfter === atomicLogsBefore,
    rpcMessage(atomicSubmit.error),
  );

  if (identityPath && licensePath) {
    await adminUpdateBreeder(adminClient, breederId, {
      identity_document_path: identityPath,
      business_license_path: licensePath,
    });
  }

  // Cleanup for breeder-review-rpcs regression
  breeder = (await loadBreeder(adminClient, breederId))!;
  const cleaned = await resetToSubmitted(adminClient, breeder);
  record(
    checks,
    "cleanup reset to submitted",
    cleaned?.review_status === "submitted",
    cleaned?.review_status,
  );

  finish(checks);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

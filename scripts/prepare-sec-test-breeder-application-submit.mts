/**
 * SEC-TEST preparation for breeder application submit / resubmit RPC tests.
 *
 * Resets SEC_TEST_BREEDER_REVIEW_ID (or SEC_TEST_REVIEW_BREEDER_ID) to draft
 * with document paths preserved for initial submit tests.
 *
 * NOT production code. Dev/test only.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_ADMIN_EMAIL
 *   SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_BREEDER_REVIEW_ID (or SEC_TEST_REVIEW_BREEDER_ID)
 *
 * Usage:
 *   npm run prepare:sec-test-breeder-application-submit
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

type BreederRow = {
  id: string;
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

function isAdminRole(user: User): boolean {
  return user.app_metadata?.role === "admin";
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

async function signInAdmin(
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

  if (userError || !user || !isAdminRole(user)) {
    record(checks, "admin role", false, userError?.message ?? "not admin");
    return null;
  }

  record(checks, "admin role", true);
  return user;
}

async function loadBreeder(
  supabase: SupabaseClient,
  breederId: string,
): Promise<{ breeder: BreederRow | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("breeders")
    .select(
      "id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at, profile_completed",
    )
    .eq("id", breederId)
    .maybeSingle();

  if (error || !data) {
    return { breeder: null, errorMessage: error?.message ?? "breeder not found" };
  }

  return { breeder: data as BreederRow };
}

async function resetBreederToDraft(
  supabase: SupabaseClient,
  breederId: string,
  checks: Check[],
): Promise<BreederRow | null> {
  const { breeder: before, errorMessage } = await loadBreeder(supabase, breederId);
  record(checks, "breeder lookup", before != null, errorMessage);

  if (!before) {
    return null;
  }

  if (!before.identity_document_path || !before.business_license_path) {
    record(
      checks,
      "document paths present",
      false,
      "identity_document_path and business_license_path required",
    );
    return null;
  }

  record(checks, "document paths present", true);

  const expiresAt =
    before.registration_expires_at &&
    before.registration_expires_at >= new Date().toISOString().slice(0, 10)
      ? before.registration_expires_at
      : futureRegistrationDate();

  const { data, error } = await supabase
    .from("breeders")
    .update({
      review_status: "draft",
      identity_verification_status: "unverified",
      business_verification_status: "unverified",
      profile_completed: false,
      approved_at: null,
      registration_expires_at: expiresAt,
    })
    .eq("id", breederId)
    .select(
      "id, review_status, identity_verification_status, business_verification_status, membership_status, identity_document_path, business_license_path, registration_expires_at, approved_at, profile_completed",
    )
    .maybeSingle();

  const ok = error == null && data != null;
  record(checks, "reset to draft", ok, error?.message);

  return ok ? (data as BreederRow) : null;
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  let supabaseUrl: string;
  let publishableKey: string;
  let adminEmail: string;
  let adminPassword: string;
  let breederId: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
    adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
    breederId =
      optionalEnv("SEC_TEST_BREEDER_REVIEW_ID") ?? requireEnv("SEC_TEST_REVIEW_BREEDER_ID");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid environment";
    console.log(`FAIL environment (${message})`);
    process.exitCode = 1;
    return;
  }

  const adminClient = createAnonClient(supabaseUrl, publishableKey);
  const adminUser = await signInAdmin(adminClient, adminEmail, adminPassword, checks);

  if (!adminUser) {
    process.exitCode = 1;
    return;
  }

  const breeder = await resetBreederToDraft(adminClient, breederId, checks);

  console.log("");
  console.log("Environment hints for test-breeder-application-submit-rpcs.mts:");
  console.log(`SEC_TEST_BREEDER_APPLICATION_SUBMIT_ID=${breederId}`);

  if (breeder) {
    console.log(
      `review_status=${breeder.review_status} profile_completed=${breeder.profile_completed}`,
    );
  }

  const failed = checks.some((check) => !check.passed);
  console.log("");
  console.log(
    `${checks.filter((c) => c.passed).length} passed / ${checks.filter((c) => !c.passed).length} failed`,
  );

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

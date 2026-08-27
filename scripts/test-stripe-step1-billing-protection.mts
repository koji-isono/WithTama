/**
 * Stripe Step 1 — DB / billing column protection security test.
 *
 * Requires migration:
 *   supabase/migrations/20260826173000_stripe_step1_billing_columns_and_protection.sql
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY (service_role billing update + webhook UNIQUE tests; required for full PASS)
 *
 * Usage:
 *   npm run test:stripe-step1-billing
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
  skipped?: boolean;
};

type BreederRow = {
  id: string;
  business_name: string | null;
  membership_status: string;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  stripe_price_id: string | null;
  subscription_current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_payment_failed_at: string | null;
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

function skip(checks: Check[], name: string, detail: string): void {
  checks.push({ name, passed: true, detail, skipped: true });
  console.log(`SKIP ${name} (${detail})`);
}

function finish(checks: Check[]): void {
  const executed = checks.filter((c) => !c.skipped);
  const passed = executed.filter((c) => c.passed).length;
  const failed = executed.length - passed;
  const skipped = checks.filter((c) => c.skipped).length;
  console.log("");
  console.log(`${passed} passed / ${failed} failed / ${skipped} skipped`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

function isBillingGuardError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  return (
    message.includes("not allowed") ||
    message.includes("42501") ||
    message.toLowerCase().includes("permission denied")
  );
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

async function fetchBreederRow(
  supabase: SupabaseClient,
  breederId: string,
): Promise<{ row: BreederRow | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("breeders")
    .select(
      "id, business_name, membership_status, stripe_customer_id, subscription_status, stripe_price_id, subscription_current_period_end, cancel_at_period_end, last_payment_failed_at",
    )
    .eq("id", breederId)
    .maybeSingle();

  if (error) {
    return { row: null, errorMessage: error.message };
  }

  return { row: data as BreederRow | null };
}

async function testBillingColumnsExist(
  supabase: SupabaseClient,
  breederId: string,
  checks: Check[],
): Promise<boolean> {
  const { row, errorMessage } = await fetchBreederRow(supabase, breederId);
  const ok = row != null && errorMessage == null;
  record(
    checks,
    "1. breeders billing columns exist (select)",
    ok,
    errorMessage ?? (ok ? "stripe_price_id, subscription_current_period_end, etc." : "no row"),
  );
  return ok;
}

function alternateMembershipStatus(current: string): string {
  const candidates = ["pending", "active", "suspended", "canceled"] as const;
  const alternate = candidates.find((status) => status !== current);
  return alternate ?? "suspended";
}

/** RLS with no policies: PostgREST returns 200 + [] (no visible rows), not an error. */
function isWebhookEventsSelectDenied(result: {
  data: unknown[] | null;
  error: { message: string } | null;
}): boolean {
  if (result.error != null) {
    return true;
  }
  return (result.data?.length ?? 0) === 0;
}

async function testWebhookEventsTable(
  serviceClient: SupabaseClient | null,
  anonClient: SupabaseClient,
  breederClient: SupabaseClient,
  checks: Check[],
): Promise<void> {
  const eventId = `evt_sec_test_${Date.now()}`;

  const anonSelect = await anonClient.from("stripe_webhook_events").select("id").limit(1);
  record(
    checks,
    "3. anon SELECT stripe_webhook_events denied",
    isWebhookEventsSelectDenied(anonSelect),
    anonSelect.error?.message ?? `rows=${anonSelect.data?.length ?? 0}`,
  );

  const anonInsert = await anonClient.from("stripe_webhook_events").insert({
    stripe_event_id: `${eventId}_anon`,
    event_type: "test.anon",
  });
  record(
    checks,
    "3b. anon INSERT stripe_webhook_events denied",
    anonInsert.error != null,
    anonInsert.error?.message,
  );

  const authSelect = await breederClient.from("stripe_webhook_events").select("id").limit(1);
  record(
    checks,
    "4. authenticated SELECT stripe_webhook_events denied",
    isWebhookEventsSelectDenied(authSelect),
    authSelect.error?.message ?? `rows=${authSelect.data?.length ?? 0}`,
  );

  const authInsert = await breederClient.from("stripe_webhook_events").insert({
    stripe_event_id: `${eventId}_auth`,
    event_type: "test.auth",
  });
  record(
    checks,
    "4b. authenticated INSERT stripe_webhook_events denied",
    authInsert.error != null,
    authInsert.error?.message,
  );

  if (!serviceClient) {
    skip(checks, "2. stripe_event_id UNIQUE", "SUPABASE_SERVICE_ROLE_KEY not set");
    skip(checks, "10. service_role updates billing columns", "SUPABASE_SERVICE_ROLE_KEY not set");
    skip(checks, "12. membership_status CHECK maintained", "SUPABASE_SERVICE_ROLE_KEY not set");
    return;
  }

  const firstInsert = await serviceClient.from("stripe_webhook_events").insert({
    stripe_event_id: eventId,
    event_type: "test.service_role",
  });
  record(
    checks,
    "2. stripe_webhook_events insert (service_role)",
    firstInsert.error == null,
    firstInsert.error?.message,
  );

  const duplicateInsert = await serviceClient.from("stripe_webhook_events").insert({
    stripe_event_id: eventId,
    event_type: "test.duplicate",
  });
  record(
    checks,
    "2b. stripe_event_id UNIQUE enforced",
    duplicateInsert.error != null,
    duplicateInsert.error?.message,
  );
}

async function testBreederBillingGuard(
  breederClient: SupabaseClient,
  breederId: string,
  checks: Check[],
): Promise<string | null> {
  const { row: before } = await fetchBreederRow(breederClient, breederId);
  if (!before) {
    record(checks, "breeder row load", false, "missing breeder");
    return null;
  }

  const blockedMembershipStatus = alternateMembershipStatus(before.membership_status);
  const membershipAttempt = await breederClient
    .from("breeders")
    .update({ membership_status: blockedMembershipStatus })
    .eq("id", breederId)
    .select("id");
  record(
    checks,
    "5. breeder membership_status update denied",
    membershipAttempt.error != null && isBillingGuardError(membershipAttempt.error.message),
    membershipAttempt.error?.message ??
      `update unexpectedly succeeded (attempted ${before.membership_status} -> ${blockedMembershipStatus})`,
  );

  const customerAttempt = await breederClient
    .from("breeders")
    .update({ stripe_customer_id: "cus_sec_test_blocked" })
    .eq("id", breederId)
    .select("id");
  record(
    checks,
    "6. breeder stripe_customer_id update denied",
    customerAttempt.error != null && isBillingGuardError(customerAttempt.error.message),
    customerAttempt.error?.message ?? "update unexpectedly succeeded",
  );

  const subscriptionStatusAttempt = await breederClient
    .from("breeders")
    .update({ subscription_status: "active" })
    .eq("id", breederId)
    .select("id");
  record(
    checks,
    "7. breeder subscription_status update denied",
    subscriptionStatusAttempt.error != null &&
      isBillingGuardError(subscriptionStatusAttempt.error.message),
    subscriptionStatusAttempt.error?.message ?? "update unexpectedly succeeded",
  );

  const stripePriceAttempt = await breederClient
    .from("breeders")
    .update({ stripe_price_id: "price_sec_test_blocked" })
    .eq("id", breederId)
    .select("id");
  record(
    checks,
    "8. breeder stripe_price_id update denied",
    stripePriceAttempt.error != null && isBillingGuardError(stripePriceAttempt.error.message),
    stripePriceAttempt.error?.message ?? "update unexpectedly succeeded",
  );

  const periodEndAttempt = await breederClient
    .from("breeders")
    .update({ subscription_current_period_end: new Date().toISOString() })
    .eq("id", breederId)
    .select("id");
  record(
    checks,
    "8b. breeder subscription_current_period_end update denied",
    periodEndAttempt.error != null && isBillingGuardError(periodEndAttempt.error.message),
    periodEndAttempt.error?.message,
  );

  const cancelAtEndAttempt = await breederClient
    .from("breeders")
    .update({ cancel_at_period_end: true })
    .eq("id", breederId)
    .select("id");
  record(
    checks,
    "8c. breeder cancel_at_period_end update denied",
    cancelAtEndAttempt.error != null && isBillingGuardError(cancelAtEndAttempt.error.message),
    cancelAtEndAttempt.error?.message,
  );

  const paymentFailedAttempt = await breederClient
    .from("breeders")
    .update({ last_payment_failed_at: new Date().toISOString() })
    .eq("id", breederId)
    .select("id");
  record(
    checks,
    "8d. breeder last_payment_failed_at update denied",
    paymentFailedAttempt.error != null && isBillingGuardError(paymentFailedAttempt.error.message),
    paymentFailedAttempt.error?.message,
  );

  const originalName = before.business_name ?? "SEC-TEST Profile Name";
  const patchedName = `${originalName} [stripe-step1-${Date.now()}]`;
  const profileAttempt = await breederClient
    .from("breeders")
    .update({ business_name: patchedName })
    .eq("id", breederId)
    .select("business_name");

  const profileOk =
    profileAttempt.error == null && profileAttempt.data?.[0]?.business_name === patchedName;

  record(
    checks,
    "9. breeder profile field update allowed",
    profileOk,
    profileAttempt.error?.message ?? profileAttempt.data?.[0]?.business_name,
  );

  if (profileOk) {
    await breederClient
      .from("breeders")
      .update({ business_name: originalName })
      .eq("id", breederId);
  }

  return before.membership_status;
}

async function testServiceRoleBillingUpdate(
  serviceClient: SupabaseClient,
  breederId: string,
  originalMembership: string,
  checks: Check[],
): Promise<void> {
  const updateResult = await serviceClient
    .from("breeders")
    .update({
      stripe_price_id: "price_sec_test_service_role",
      subscription_current_period_end: new Date().toISOString(),
      cancel_at_period_end: false,
      last_payment_failed_at: null,
    })
    .eq("id", breederId)
    .select(
      "membership_status, stripe_price_id, subscription_current_period_end, cancel_at_period_end",
    );

  const ok =
    updateResult.error == null &&
    updateResult.data?.[0]?.stripe_price_id === "price_sec_test_service_role";

  record(
    checks,
    "10. service_role billing columns update allowed",
    ok,
    updateResult.error?.message ?? updateResult.data?.[0]?.stripe_price_id,
  );

  if (ok) {
    await serviceClient
      .from("breeders")
      .update({
        stripe_price_id: null,
        subscription_current_period_end: null,
        cancel_at_period_end: false,
        last_payment_failed_at: null,
        membership_status: originalMembership,
      })
      .eq("id", breederId);
  }
}

async function testMembershipCheckConstraint(
  serviceClient: SupabaseClient | null,
  breederId: string,
  checks: Check[],
): Promise<void> {
  if (!serviceClient) {
    return;
  }

  const { row: before } = await fetchBreederRow(serviceClient, breederId);
  const original = before?.membership_status ?? "pending";

  const invalidUpdate = await serviceClient
    .from("breeders")
    .update({ membership_status: "invalid_status_xyz" })
    .eq("id", breederId)
    .select("id");

  const checkFailed = invalidUpdate.error != null;

  record(
    checks,
    "12. membership_status CHECK maintained",
    checkFailed,
    invalidUpdate.error?.message ?? "invalid value accepted",
  );

  await serviceClient.from("breeders").update({ membership_status: original }).eq("id", breederId);
}

async function testAdminBillingGuardDenied(
  supabaseUrl: string,
  publishableKey: string,
  breederId: string,
  checks: Check[],
): Promise<void> {
  const adminEmail = optionalEnv("SEC_TEST_ADMIN_EMAIL");
  const adminPassword = optionalEnv("SEC_TEST_ADMIN_PASSWORD");

  if (!adminEmail || !adminPassword) {
    skip(checks, "14. admin membership_status update denied", "SEC_TEST_ADMIN_* not set");
    skip(checks, "14b. admin stripe_customer_id update denied", "SEC_TEST_ADMIN_* not set");
    return;
  }

  const adminClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (signInError) {
    record(checks, "14. admin authentication", false, signInError.message);
    return;
  }

  const { row: adminTarget } = await fetchBreederRow(adminClient, breederId);
  const blockedMembershipStatus = alternateMembershipStatus(
    adminTarget?.membership_status ?? "active",
  );

  const membershipAttempt = await adminClient
    .from("breeders")
    .update({ membership_status: blockedMembershipStatus })
    .eq("id", breederId)
    .select("id");

  record(
    checks,
    "14. admin membership_status update denied",
    membershipAttempt.error != null && isBillingGuardError(membershipAttempt.error.message),
    membershipAttempt.error?.message ??
      `update unexpectedly succeeded (attempted -> ${blockedMembershipStatus})`,
  );

  const customerAttempt = await adminClient
    .from("breeders")
    .update({ stripe_customer_id: "cus_sec_test_admin_blocked" })
    .eq("id", breederId)
    .select("id");

  record(
    checks,
    "14b. admin stripe_customer_id update denied",
    customerAttempt.error != null && isBillingGuardError(customerAttempt.error.message),
    customerAttempt.error?.message ?? "update unexpectedly succeeded",
  );
}

async function testPublicViewReadable(anonClient: SupabaseClient, checks: Check[]): Promise<void> {
  const { data, error } = await anonClient.from("published_pets_public").select("id").limit(1);
  record(
    checks,
    "13. published_pets_public still readable",
    error == null,
    error?.message ?? `rows=${data?.length ?? 0}`,
  );
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
  const serviceRoleKey = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");

  const anonClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const breederClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await breederClient.auth.signInWithPassword({
    email: breederEmail,
    password: breederPassword,
  });
  record(checks, "breeder authentication", signInError == null, signInError?.message);
  if (signInError) {
    finish(checks);
    return;
  }

  const {
    data: { user },
  } = await breederClient.auth.getUser();
  if (!user) {
    record(checks, "breeder user", false, "no user");
    finish(checks);
    return;
  }

  const breederId = await loadBreederId(breederClient, user.id);
  if (!breederId) {
    record(checks, "breeder id lookup", false, "no breeders row");
    finish(checks);
    return;
  }

  const columnsOk = await testBillingColumnsExist(breederClient, breederId, checks);
  if (!columnsOk) {
    console.log("");
    console.log(
      "Migration not applied? Run 20260826173000_stripe_step1_billing_columns_and_protection.sql on the linked database.",
    );
    finish(checks);
    return;
  }

  const serviceClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  await testWebhookEventsTable(serviceClient, anonClient, breederClient, checks);

  const originalMembership = await testBreederBillingGuard(breederClient, breederId, checks);

  if (serviceClient && originalMembership) {
    await testServiceRoleBillingUpdate(serviceClient, breederId, originalMembership, checks);
  }

  await testMembershipCheckConstraint(serviceClient, breederId, checks);
  await testAdminBillingGuardDenied(supabaseUrl, publishableKey, breederId, checks);
  await testPublicViewReadable(anonClient, checks);

  skip(
    checks,
    "11. BR-09 breeder review RPCs",
    "run npm run test:breeder-application-submit-rpcs separately",
  );

  finish(checks);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  process.exitCode = 1;
});

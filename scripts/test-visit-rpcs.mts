/**
 * Visit RPC security / integration test (Supabase JWT + .rpc(), no Service Role).
 *
 * Requires migration 20260824120000_create_visit_rpcs.sql applied to the target DB.
 * Requires migration 20260824183000_complete_visit_requires_scheduled_at_elapsed.sql for complete_visit timing checks.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BUYER_EMAIL
 *   SEC_TEST_BUYER_PASSWORD
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *
 * Optional:
 *   SEC_TEST_INQUIRY_PET_ID — published pet for new inquiries (auto-discovered if omitted)
 *   SEC_TEST_ADMIN_EMAIL / SEC_TEST_ADMIN_PASSWORD — unauthorized cancel_visit rejection
 *
 * Usage:
 *   npx tsx scripts/test-visit-rpcs.mts
 *   npm run test:visit-rpcs
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type CheckStatus = "pass" | "fail" | "skip";

type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
};

const PREFIX = `[VISIT-RPC ${Date.now()}]`;

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
  const label = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "SKIP";
  console.log(`${label} ${name}${suffix}`);
}

function summarize(checks: Check[]): void {
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const skipped = checks.filter((c) => c.status === "skip").length;
  console.log("");
  console.log(`${passed} passed / ${failed} failed / ${skipped} skipped`);
}

function finish(checks: Check[]): void {
  summarize(checks);
  if (checks.some((c) => c.status === "fail")) {
    process.exitCode = 1;
  }
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
): Promise<{ userId: string }> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`sign-in failed (${email}): ${error?.message ?? "no user"}`);
  }
  return { userId: data.user.id };
}

function futureIso(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function secondsFromNowIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function pastIso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveTestPetId(
  buyerClient: SupabaseClient,
  breederId: string,
): Promise<string | null> {
  const configuredPetId = optionalEnv("SEC_TEST_INQUIRY_PET_ID");
  if (configuredPetId) {
    return configuredPetId;
  }

  const { data: breederPet } = await buyerClient
    .from("published_pets_public")
    .select("id")
    .eq("breeder_id", breederId)
    .limit(1)
    .maybeSingle();

  if (breederPet?.id) {
    return breederPet.id as string;
  }

  const { data: anyPublishedPet } = await buyerClient
    .from("published_pets_public")
    .select("id")
    .limit(1)
    .maybeSingle();

  return (anyPublishedPet?.id as string | undefined) ?? null;
}

async function createTestInquiry(
  buyerClient: SupabaseClient,
  buyerId: string,
  petId: string,
  label: string,
): Promise<{ inquiryId: string } | { error: string }> {
  const { data: petContext, error: petContextError } = await buyerClient
    .from("published_pet_detail_public")
    .select("breeder_id, public_display_name")
    .eq("id", petId)
    .maybeSingle();

  if (petContextError || !petContext?.breeder_id) {
    return { error: petContextError?.message ?? "pet context missing breeder_id" };
  }

  const subject = petContext.public_display_name
    ? `${PREFIX} ${label}: ${petContext.public_display_name}`
    : `${PREFIX} ${label}`;

  const { data: createdInquiry, error: createInquiryError } = await buyerClient
    .from("inquiries")
    .insert({
      buyer_id: buyerId,
      breeder_id: petContext.breeder_id,
      pet_id: petId,
      status: "open",
      subject,
    })
    .select("id")
    .single();

  if (createInquiryError || !createdInquiry?.id) {
    return { error: createInquiryError?.message ?? "inquiry insert failed" };
  }

  const buyerUserId = (await buyerClient.auth.getUser()).data.user?.id;
  const { error: messageError } = await buyerClient.from("inquiry_messages").insert({
    inquiry_id: createdInquiry.id,
    sender_type: "buyer",
    sender_user_id: buyerUserId,
    message: `${PREFIX} ${label} initial message`,
  });

  if (messageError) {
    return { error: messageError.message };
  }

  return { inquiryId: createdInquiry.id as string };
}

async function findInquiryWithoutVisit(
  buyerClient: SupabaseClient,
  excludeIds: string[] = [],
): Promise<string | null> {
  const { data: openInquiries, error: inquiryPickError } = await buyerClient
    .from("inquiries")
    .select("id")
    .in("status", ["open", "replied"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (inquiryPickError) {
    return null;
  }

  for (const row of openInquiries ?? []) {
    if (excludeIds.includes(row.id)) {
      continue;
    }

    const { count, error: visitCountError } = await buyerClient
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("inquiry_id", row.id);

    if (visitCountError) {
      continue;
    }

    if ((count ?? 0) === 0) {
      return row.id;
    }
  }

  return null;
}

async function rpcExists(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.rpc("request_visit", {
    p_inquiry_id: "00000000-0000-0000-0000-000000000000",
    p_requested_at: futureIso(24),
  });
  if (!error) {
    return true;
  }
  const msg = error.message.toLowerCase();
  if (msg.includes("could not find the function") || msg.includes("schema cache")) {
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const buyerEmail = requireEnv("SEC_TEST_BUYER_EMAIL");
  const buyerPassword = requireEnv("SEC_TEST_BUYER_PASSWORD");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");

  const anonClient = createAuthClient(url, key);

  if (!(await rpcExists(anonClient))) {
    record(
      checks,
      "migration applied (request_visit exists)",
      "skip",
      "apply 20260824120000_create_visit_rpcs.sql first",
    );
    finish(checks);
    return;
  }

  record(checks, "migration applied (request_visit exists)", "pass");

  const { error: anonError } = await anonClient.rpc("request_visit", {
    p_inquiry_id: "00000000-0000-0000-0000-000000000000",
    p_requested_at: futureIso(24),
  });
  record(
    checks,
    "unauthenticated request_visit rejected",
    anonError ? "pass" : "fail",
    anonError?.message,
  );

  const buyerClient = createAuthClient(url, key);
  await signIn(buyerClient, buyerEmail, buyerPassword);

  const { data: buyerRow, error: buyerRowError } = await buyerClient
    .from("buyers")
    .select("id")
    .maybeSingle();

  if (buyerRowError || !buyerRow?.id) {
    record(checks, "resolve buyer profile", "fail", buyerRowError?.message ?? "no buyer row");
    finish(checks);
    return;
  }

  const breederClient = createAuthClient(url, key);
  const { userId: breederUserId } = await signIn(breederClient, breederEmail, breederPassword);

  const { data: breederRow, error: breederRowError } = await breederClient
    .from("breeders")
    .select("id")
    .eq("user_id", breederUserId)
    .maybeSingle();

  if (breederRowError || !breederRow?.id) {
    record(checks, "resolve breeder profile", "fail", breederRowError?.message ?? "no breeder row");
    finish(checks);
    return;
  }

  let inquiryId = await findInquiryWithoutVisit(buyerClient);

  if (!inquiryId) {
    const petId = await resolveTestPetId(buyerClient, breederRow.id);

    if (!petId) {
      record(checks, "resolve published pet for test inquiry", "fail", "no published pet found");
      finish(checks);
      return;
    }

    const created = await createTestInquiry(buyerClient, buyerRow.id, petId, "happy path");
    if ("error" in created) {
      record(checks, "create happy path test inquiry", "fail", created.error);
      finish(checks);
      return;
    }

    inquiryId = created.inquiryId;
    record(checks, "create happy path test inquiry", "pass", inquiryId);
  }

  const firstPreferred = futureIso(48);
  const visitMessage = `${PREFIX} visit request message`;

  const { data: visitId, error: requestError } = await buyerClient.rpc("request_visit", {
    p_inquiry_id: inquiryId,
    p_requested_at: firstPreferred,
    p_requested_at_second: futureIso(72),
    p_message: visitMessage,
  });

  record(
    checks,
    "buyer request_visit success",
    !requestError && visitId ? "pass" : "fail",
    requestError?.message ?? String(visitId),
  );

  if (!visitId) {
    finish(checks);
    return;
  }

  const { data: inquiryAfterRequest } = await buyerClient
    .from("inquiries")
    .select("status")
    .eq("id", inquiryId)
    .single();

  record(
    checks,
    "inquiry status visit_requested after request",
    inquiryAfterRequest?.status === "visit_requested" ? "pass" : "fail",
    inquiryAfterRequest?.status,
  );

  const { error: breederRequestError } = await breederClient.rpc("request_visit", {
    p_inquiry_id: inquiryId,
    p_requested_at: futureIso(96),
  });

  record(
    checks,
    "breeder cannot request_visit",
    breederRequestError ? "pass" : "fail",
    breederRequestError?.message,
  );

  const scheduledAt = futureIso(120);

  const { error: pastScheduleError } = await breederClient.rpc("schedule_visit", {
    p_visit_id: visitId,
    p_scheduled_at: pastIso(1),
  });

  record(
    checks,
    "schedule_visit rejects past scheduled_at",
    pastScheduleError ? "pass" : "fail",
    pastScheduleError?.message,
  );

  const { error: buyerScheduleError } = await buyerClient.rpc("schedule_visit", {
    p_visit_id: visitId,
    p_scheduled_at: scheduledAt,
  });

  record(
    checks,
    "buyer cannot schedule_visit",
    buyerScheduleError ? "pass" : "fail",
    buyerScheduleError?.message,
  );

  const { error: scheduleError } = await breederClient.rpc("schedule_visit", {
    p_visit_id: visitId,
    p_scheduled_at: scheduledAt,
  });

  record(
    checks,
    "breeder schedule_visit success",
    scheduleError ? "fail" : "pass",
    scheduleError?.message,
  );

  const { data: visitScheduled } = await buyerClient
    .from("visits")
    .select("status, scheduled_at")
    .eq("id", visitId)
    .single();

  record(
    checks,
    "visit status scheduled after schedule",
    visitScheduled?.status === "scheduled" ? "pass" : "fail",
    visitScheduled?.status,
  );

  const { error: incompleteFlagsError } = await breederClient.rpc("complete_visit", {
    p_visit_id: visitId,
    p_animal_confirmed: false,
    p_explanation_completed: true,
    p_result: "considering",
  });

  record(
    checks,
    "complete_visit rejects false animal_confirmed",
    incompleteFlagsError ? "pass" : "fail",
    incompleteFlagsError?.message,
  );

  const { error: missingExplanationError } = await breederClient.rpc("complete_visit", {
    p_visit_id: visitId,
    p_animal_confirmed: true,
    p_explanation_completed: false,
    p_result: "considering",
  });

  record(
    checks,
    "complete_visit rejects false explanation_completed",
    missingExplanationError ? "pass" : "fail",
    missingExplanationError?.message,
  );

  const { error: beforeScheduledError } = await breederClient.rpc("complete_visit", {
    p_visit_id: visitId,
    p_animal_confirmed: true,
    p_explanation_completed: true,
    p_result: "considering",
  });

  record(
    checks,
    "complete_visit rejects before scheduled datetime",
    beforeScheduledError ? "pass" : "fail",
    beforeScheduledError?.message,
  );

  const completeSuccessPetId = await resolveTestPetId(buyerClient, breederRow.id);

  if (!completeSuccessPetId) {
    record(
      checks,
      "resolve published pet for complete success flow",
      "fail",
      "no published pet found",
    );
    finish(checks);
    return;
  }

  const completeSuccessInquiryResult = await createTestInquiry(
    buyerClient,
    buyerRow.id,
    completeSuccessPetId,
    "complete success flow",
  );

  if ("error" in completeSuccessInquiryResult) {
    record(
      checks,
      "create complete success test inquiry",
      "fail",
      completeSuccessInquiryResult.error,
    );
    finish(checks);
    return;
  }

  const completeSuccessInquiryId = completeSuccessInquiryResult.inquiryId;
  record(checks, "create complete success test inquiry", "pass", completeSuccessInquiryId);

  const completeSuccessPreferredAt = futureIso(24);
  const completeSuccessScheduledAt = secondsFromNowIso(4);

  const { data: completeSuccessVisitId, error: completeSuccessRequestError } =
    await buyerClient.rpc("request_visit", {
      p_inquiry_id: completeSuccessInquiryId,
      p_requested_at: completeSuccessPreferredAt,
      p_message: `${PREFIX} complete success flow visit request`,
    });

  record(
    checks,
    "complete success flow buyer request_visit",
    !completeSuccessRequestError && completeSuccessVisitId ? "pass" : "fail",
    completeSuccessRequestError?.message ?? String(completeSuccessVisitId),
  );

  if (!completeSuccessVisitId) {
    finish(checks);
    return;
  }

  const { error: completeSuccessScheduleError } = await breederClient.rpc("schedule_visit", {
    p_visit_id: completeSuccessVisitId,
    p_scheduled_at: completeSuccessScheduledAt,
  });

  record(
    checks,
    "complete success flow breeder schedule_visit",
    completeSuccessScheduleError ? "fail" : "pass",
    completeSuccessScheduleError?.message,
  );

  await sleep(4500);

  const { error: completeError } = await breederClient.rpc("complete_visit", {
    p_visit_id: completeSuccessVisitId,
    p_animal_confirmed: true,
    p_explanation_completed: true,
    p_result: "considering",
  });

  record(
    checks,
    "breeder complete_visit success",
    completeError ? "fail" : "pass",
    completeError?.message,
  );

  const { data: visitCompleted } = await buyerClient
    .from("visits")
    .select("status")
    .eq("id", completeSuccessVisitId)
    .single();

  record(
    checks,
    "visit status completed after complete",
    visitCompleted?.status === "completed" ? "pass" : "fail",
    visitCompleted?.status,
  );

  const { data: inquiryCompleted } = await buyerClient
    .from("inquiries")
    .select("status")
    .eq("id", completeSuccessInquiryId)
    .single();

  record(
    checks,
    "inquiry status completed after complete",
    inquiryCompleted?.status === "completed" ? "pass" : "fail",
    inquiryCompleted?.status,
  );

  // --- cancel flow: dedicated inquiry, schedule then cancel ---
  const cancelPetId = await resolveTestPetId(buyerClient, breederRow.id);

  if (!cancelPetId) {
    record(checks, "resolve published pet for cancel flow", "fail", "no published pet found");
    finish(checks);
    return;
  }

  const cancelInquiryResult = await createTestInquiry(
    buyerClient,
    buyerRow.id,
    cancelPetId,
    "cancel flow",
  );

  if ("error" in cancelInquiryResult) {
    record(checks, "create cancel flow test inquiry", "fail", cancelInquiryResult.error);
    finish(checks);
    return;
  }

  const cancelInquiryId = cancelInquiryResult.inquiryId;
  record(checks, "create cancel flow test inquiry", "pass", cancelInquiryId);

  const cancelPreferredAt = futureIso(36);
  const cancelScheduledAt = futureIso(60);
  const cancelReason = `${PREFIX} buyer cancel after schedule`;

  const { data: cancelVisitId, error: cancelRequestError } = await buyerClient.rpc(
    "request_visit",
    {
      p_inquiry_id: cancelInquiryId,
      p_requested_at: cancelPreferredAt,
      p_message: `${PREFIX} cancel flow visit request`,
    },
  );

  record(
    checks,
    "cancel flow buyer request_visit",
    !cancelRequestError && cancelVisitId ? "pass" : "fail",
    cancelRequestError?.message ?? String(cancelVisitId),
  );

  if (!cancelVisitId) {
    finish(checks);
    return;
  }

  const { data: inquiryVisitRequested } = await buyerClient
    .from("inquiries")
    .select("status")
    .eq("id", cancelInquiryId)
    .single();

  record(
    checks,
    "cancel flow inquiry visit_requested after request",
    inquiryVisitRequested?.status === "visit_requested" ? "pass" : "fail",
    inquiryVisitRequested?.status,
  );

  const { error: cancelScheduleError } = await breederClient.rpc("schedule_visit", {
    p_visit_id: cancelVisitId,
    p_scheduled_at: cancelScheduledAt,
  });

  record(
    checks,
    "cancel flow breeder schedule_visit",
    cancelScheduleError ? "fail" : "pass",
    cancelScheduleError?.message,
  );

  const { data: visitBeforeCancel } = await buyerClient
    .from("visits")
    .select("status, scheduled_at")
    .eq("id", cancelVisitId)
    .single();

  record(
    checks,
    "cancel flow visit scheduled before cancel",
    visitBeforeCancel?.status === "scheduled" ? "pass" : "fail",
    visitBeforeCancel?.status,
  );

  const adminEmail = optionalEnv("SEC_TEST_ADMIN_EMAIL");
  const adminPassword = optionalEnv("SEC_TEST_ADMIN_PASSWORD");

  if (adminEmail && adminPassword) {
    const adminClient = createAuthClient(url, key);
    await signIn(adminClient, adminEmail, adminPassword);

    const { error: adminCancelError } = await adminClient.rpc("cancel_visit", {
      p_visit_id: cancelVisitId,
      p_cancellation_reason: `${PREFIX} admin should not cancel`,
    });

    record(
      checks,
      "admin cannot cancel_visit",
      adminCancelError ? "pass" : "fail",
      adminCancelError?.message,
    );
  } else {
    record(checks, "admin cannot cancel_visit", "fail", "SEC_TEST_ADMIN_EMAIL/PASSWORD unset");
  }

  const { error: cancelError } = await buyerClient.rpc("cancel_visit", {
    p_visit_id: cancelVisitId,
    p_cancellation_reason: cancelReason,
  });

  record(checks, "buyer cancel_visit success", cancelError ? "fail" : "pass", cancelError?.message);

  const { data: visitCanceled } = await buyerClient
    .from("visits")
    .select("status, cancellation_reason, canceled_at")
    .eq("id", cancelVisitId)
    .single();

  record(
    checks,
    "visit status canceled after cancel",
    visitCanceled?.status === "canceled" ? "pass" : "fail",
    visitCanceled?.status,
  );

  record(
    checks,
    "cancellation_reason saved after cancel",
    visitCanceled?.cancellation_reason === cancelReason ? "pass" : "fail",
    visitCanceled?.cancellation_reason ?? "null",
  );

  record(
    checks,
    "canceled_at set after cancel",
    visitCanceled?.canceled_at ? "pass" : "fail",
    visitCanceled?.canceled_at ?? "null",
  );

  const { data: inquiryReplied } = await buyerClient
    .from("inquiries")
    .select("status")
    .eq("id", cancelInquiryId)
    .single();

  record(
    checks,
    "inquiry status replied after cancel",
    inquiryReplied?.status === "replied" ? "pass" : "fail",
    inquiryReplied?.status,
  );

  const { data: msgRows } = await buyerClient
    .from("inquiry_messages")
    .select("id")
    .eq("inquiry_id", cancelInquiryId)
    .limit(1);

  record(
    checks,
    "inquiry_messages still readable after cancel",
    (msgRows?.length ?? 0) > 0 ? "pass" : "fail",
  );

  const { error: cancelCompletedVisitError } = await buyerClient.rpc("cancel_visit", {
    p_visit_id: cancelVisitId,
    p_cancellation_reason: `${PREFIX} repeat cancel should fail`,
  });

  record(
    checks,
    "cancel_visit rejects already canceled visit",
    cancelCompletedVisitError ? "pass" : "fail",
    cancelCompletedVisitError?.message,
  );

  finish(checks);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * BY-09 visit detail integration test (Supabase JWT + RPC, no Service Role).
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BUYER_EMAIL
 *   SEC_TEST_BUYER_PASSWORD
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *
 * Usage:
 *   npm run test:buyer-visit-detail-e2e
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getVisitStatusLabel } from "../src/features/visits/format";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type CheckStatus = "pass" | "fail" | "skip";

type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
};

const PREFIX = `[BY09-E2E ${Date.now()}]`;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
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

async function main(): Promise<void> {
  const checks: Check[] = [];
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const buyerEmail = requireEnv("SEC_TEST_BUYER_EMAIL");
  const buyerPassword = requireEnv("SEC_TEST_BUYER_PASSWORD");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");

  const anonClient = createAuthClient(url, key);

  const { data: buyerVisitsAnon } = await anonClient.from("visits").select("id").limit(1);

  record(
    checks,
    "1. unauthenticated cannot read visits",
    !buyerVisitsAnon || buyerVisitsAnon.length === 0 ? "pass" : "fail",
  );

  const buyerClient = createAuthClient(url, key);
  await signIn(buyerClient, buyerEmail, buyerPassword);

  const { data: buyerRow } = await buyerClient.from("buyers").select("id").maybeSingle();

  if (!buyerRow?.id) {
    record(checks, "buyer profile", "fail", "no buyer row");
    finish(checks);
    return;
  }

  const { data: foreignVisit } = await buyerClient
    .from("visits")
    .select("id")
    .neq("buyer_id", buyerRow.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (foreignVisit?.id) {
    const { data: deniedVisit } = await buyerClient
      .from("visits")
      .select("id")
      .eq("id", foreignVisit.id)
      .maybeSingle();

    record(checks, "2. other buyer visit not readable", deniedVisit == null ? "pass" : "fail");
  } else {
    record(checks, "2. other buyer visit not readable", "skip", "no foreign visit sample");
  }

  const { data: missingVisit } = await buyerClient
    .from("visits")
    .select("id")
    .eq("id", "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  record(checks, "3. nonexistent visit not readable", missingVisit == null ? "pass" : "fail");

  const { data: ownVisits } = await buyerClient
    .from("visits")
    .select(
      "id, inquiry_id, status, requested_at, requested_at_second, requested_at_third, scheduled_at, created_at, cancellation_reason, canceled_at",
    )
    .eq("buyer_id", buyerRow.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  let requestedVisit = (ownVisits ?? []).find((row) => row.status === "requested");
  let scheduledVisit = (ownVisits ?? []).find((row) => row.status === "scheduled");
  const completedVisit = (ownVisits ?? []).find((row) => row.status === "completed");
  const canceledVisit = (ownVisits ?? []).find((row) => row.status === "canceled");

  if (!requestedVisit) {
    const { data: petRow } = await buyerClient
      .from("published_pets_public")
      .select("id, breeder_id")
      .limit(1)
      .maybeSingle();

    if (petRow?.id) {
      const { data: createdInquiry, error: inquiryError } = await buyerClient
        .from("inquiries")
        .insert({
          buyer_id: buyerRow.id,
          breeder_id: petRow.breeder_id,
          pet_id: petRow.id,
          status: "open",
          subject: `${PREFIX} inquiry`,
        })
        .select("id")
        .single();

      if (!inquiryError && createdInquiry?.id) {
        await buyerClient.from("inquiry_messages").insert({
          inquiry_id: createdInquiry.id,
          sender_type: "buyer",
          sender_user_id: (await buyerClient.auth.getUser()).data.user?.id,
          message: `${PREFIX} setup`,
        });

        const { data: newVisitId, error: requestError } = await buyerClient.rpc("request_visit", {
          p_inquiry_id: createdInquiry.id,
          p_requested_at: futureIso(48),
          p_requested_at_second: futureIso(72),
          p_message: `${PREFIX} visit message`,
        });

        if (!requestError && newVisitId) {
          const { data: createdVisit } = await buyerClient
            .from("visits")
            .select(
              "id, inquiry_id, status, requested_at, requested_at_second, requested_at_third, scheduled_at, created_at, cancellation_reason, canceled_at",
            )
            .eq("id", newVisitId)
            .single();

          requestedVisit = createdVisit ?? undefined;
        }
      }
    }
  }

  record(
    checks,
    "4. requested status readable",
    requestedVisit?.status === "requested" ? "pass" : "fail",
    requestedVisit ? getVisitStatusLabel(String(requestedVisit.status)) : undefined,
  );

  if (requestedVisit?.requested_at) {
    record(checks, "5. requested_at displayed in row", "pass", String(requestedVisit.requested_at));
  } else {
    record(checks, "5. requested_at displayed in row", "fail");
  }

  if (requestedVisit?.requested_at_second) {
    record(checks, "6. second preferred readable", "pass");
  } else {
    record(checks, "6. second preferred readable", "skip", "no second preferred on sample");
  }

  const breederClient = createAuthClient(url, key);
  await signIn(breederClient, breederEmail, breederPassword);

  if (requestedVisit && !scheduledVisit) {
    const scheduleAt = futureIso(96);
    const { error: scheduleError } = await breederClient.rpc("schedule_visit", {
      p_visit_id: requestedVisit.id,
      p_scheduled_at: scheduleAt,
    });

    if (!scheduleError) {
      const { data: scheduledRow } = await buyerClient
        .from("visits")
        .select("id, status, scheduled_at")
        .eq("id", requestedVisit.id)
        .single();

      scheduledVisit = scheduledRow ?? undefined;
    }
  }

  record(
    checks,
    "7. scheduled status readable",
    scheduledVisit?.status === "scheduled" ? "pass" : "fail",
    scheduledVisit?.status,
  );

  record(
    checks,
    "8. scheduled_at readable when scheduled",
    scheduledVisit?.scheduled_at ? "pass" : "fail",
    scheduledVisit?.scheduled_at ? String(scheduledVisit.scheduled_at) : undefined,
  );

  record(
    checks,
    "9. completed status sample",
    completedVisit ? "pass" : "skip",
    completedVisit ? getVisitStatusLabel(String(completedVisit.status)) : "no completed sample",
  );

  record(
    checks,
    "10. canceled status sample",
    canceledVisit ? "pass" : "skip",
    canceledVisit ? getVisitStatusLabel(String(canceledVisit.status)) : "no canceled sample",
  );

  let cancelTargetId = requestedVisit?.id;

  if (cancelTargetId && requestedVisit?.status !== "requested") {
    cancelTargetId = undefined;
  }

  if (!cancelTargetId) {
    const { data: petRow } = await buyerClient
      .from("published_pets_public")
      .select("id, breeder_id")
      .limit(1)
      .maybeSingle();

    if (petRow?.id) {
      const { data: createdInquiry } = await buyerClient
        .from("inquiries")
        .insert({
          buyer_id: buyerRow.id,
          breeder_id: petRow.breeder_id,
          pet_id: petRow.id,
          status: "open",
          subject: `${PREFIX} cancel inquiry`,
        })
        .select("id")
        .single();

      if (createdInquiry?.id) {
        const { data: cancelVisitId } = await buyerClient.rpc("request_visit", {
          p_inquiry_id: createdInquiry.id,
          p_requested_at: futureIso(120),
          p_message: `${PREFIX} cancel target`,
        });

        cancelTargetId = cancelVisitId ?? undefined;
      }
    }
  }

  if (!cancelTargetId) {
    record(checks, "11-15. buyer cancel flow", "skip", "no cancel target visit");
    finish(checks);
    return;
  }

  const cancelReason = `${PREFIX} buyer cancel reason`;

  const { error: cancelError } = await buyerClient.rpc("cancel_visit", {
    p_visit_id: cancelTargetId,
    p_cancellation_reason: cancelReason,
  });

  record(
    checks,
    "11. buyer cancel_visit success",
    cancelError ? "fail" : "pass",
    cancelError?.message,
  );

  const { data: canceledRow } = await buyerClient
    .from("visits")
    .select("status, cancellation_reason, canceled_at")
    .eq("id", cancelTargetId)
    .single();

  record(
    checks,
    "12. status canceled after cancel",
    canceledRow?.status === "canceled" ? "pass" : "fail",
    canceledRow?.status,
  );

  record(
    checks,
    "13. cancellation_reason saved",
    canceledRow?.cancellation_reason === cancelReason ? "pass" : "fail",
    canceledRow?.cancellation_reason ?? "null",
  );

  record(checks, "14. canceled_at set", canceledRow?.canceled_at ? "pass" : "fail");

  const { error: duplicateCancelError } = await buyerClient.rpc("cancel_visit", {
    p_visit_id: cancelTargetId,
    p_cancellation_reason: `${PREFIX} repeat`,
  });

  record(
    checks,
    "15. duplicate cancel rejected",
    duplicateCancelError ? "pass" : "fail",
    duplicateCancelError?.message,
  );

  finish(checks);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

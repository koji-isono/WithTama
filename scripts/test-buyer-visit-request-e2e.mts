/**
 * BY-07 visit request integration test (Supabase JWT + RPC, no Service Role).
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BUYER_EMAIL
 *   SEC_TEST_BUYER_PASSWORD
 *   SEC_TEST_BREEDER_EMAIL (for unauthorized access check)
 *   SEC_TEST_BREEDER_PASSWORD
 *
 * Usage:
 *   npm run test:buyer-visit-request-e2e
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { mapRequestVisitRpcError } from "../src/features/visits/errors";
import {
  hasVisitRequestValidationErrors,
  validateVisitRequestForm,
} from "../src/features/visits/validation";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type CheckStatus = "pass" | "fail" | "skip";

type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
};

const PREFIX = `[BY07-E2E ${Date.now()}]`;

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

function futureLocal(hoursFromNow: number): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

  const { error: anonError } = await anonClient.rpc("request_visit", {
    p_inquiry_id: "00000000-0000-0000-0000-000000000000",
    p_requested_at: futureIso(24),
  });

  record(
    checks,
    "1. unauthenticated request_visit rejected",
    anonError ? "pass" : "fail",
    anonError?.message,
  );

  const pastErrors = validateVisitRequestForm({
    inquiryId: "550e8400-e29b-41d4-a716-446655440000",
    requestedAt: "2000-01-01T10:00",
    requestedAtSecond: "",
    requestedAtThird: "",
    message: "test",
  });

  record(
    checks,
    "2. past datetime validation rejected",
    pastErrors.requestedAt ? "pass" : "fail",
    pastErrors.requestedAt,
  );

  record(
    checks,
    "3. required field validation",
    validateVisitRequestForm({
      inquiryId: "550e8400-e29b-41d4-a716-446655440000",
      requestedAt: "",
      requestedAtSecond: "",
      requestedAtThird: "",
      message: "",
    }).requestedAt
      ? "pass"
      : "fail",
  );

  const buyerClient = createAuthClient(url, key);
  await signIn(buyerClient, buyerEmail, buyerPassword);

  const { data: buyerRow } = await buyerClient.from("buyers").select("id").maybeSingle();

  if (!buyerRow?.id) {
    record(checks, "buyer profile", "fail", "no buyer row");
    finish(checks);
    return;
  }

  const { data: foreignInquiry } = await buyerClient
    .from("inquiries")
    .select("id")
    .neq("buyer_id", buyerRow.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (foreignInquiry?.id) {
    const { error: foreignError } = await buyerClient.rpc("request_visit", {
      p_inquiry_id: foreignInquiry.id,
      p_requested_at: futureIso(24),
      p_message: `${PREFIX} foreign`,
    });

    record(
      checks,
      "4. other buyer inquiry rejected",
      foreignError ? "pass" : "fail",
      foreignError ? mapRequestVisitRpcError(foreignError.message) : undefined,
    );
  } else {
    record(checks, "4. other buyer inquiry rejected", "skip", "no foreign inquiry sample");
  }

  const breederClient = createAuthClient(url, key);
  await signIn(breederClient, breederEmail, breederPassword);

  const { data: ownInquiry } = await buyerClient
    .from("inquiries")
    .select("id, status")
    .eq("buyer_id", buyerRow.id)
    .in("status", ["open", "replied"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  let targetInquiryId: string | null = null;

  for (const row of ownInquiry ?? []) {
    const { count } = await buyerClient
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("inquiry_id", row.id);

    if ((count ?? 0) === 0) {
      targetInquiryId = row.id;
      break;
    }
  }

  if (!targetInquiryId) {
    const { data: petRow } = await buyerClient
      .from("published_pets_public")
      .select("id, breeder_id")
      .limit(1)
      .maybeSingle();

    if (petRow?.id) {
      const { data: createdInquiry, error: createError } = await buyerClient
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

      if (!createError && createdInquiry?.id) {
        await buyerClient.from("inquiry_messages").insert({
          inquiry_id: createdInquiry.id,
          sender_type: "buyer",
          sender_user_id: (await buyerClient.auth.getUser()).data.user?.id,
          message: `${PREFIX} setup message`,
        });
        targetInquiryId = createdInquiry.id;
      }
    }
  }

  if (!targetInquiryId) {
    record(checks, "5-10. visit request success flow", "skip", "no inquiry without visit");
    finish(checks);
    return;
  }

  const { error: breederRequestError } = await breederClient.rpc("request_visit", {
    p_inquiry_id: targetInquiryId,
    p_requested_at: futureIso(24),
  });

  record(
    checks,
    "5. breeder cannot request_visit",
    breederRequestError ? "pass" : "fail",
    breederRequestError?.message,
  );

  const localFirst = futureLocal(48);
  const validationOk = !hasVisitRequestValidationErrors(
    validateVisitRequestForm({
      inquiryId: targetInquiryId,
      requestedAt: localFirst,
      requestedAtSecond: futureLocal(72),
      requestedAtThird: "",
      message: `${PREFIX} visit message`,
    }),
  );

  record(
    checks,
    "6. client-side validation passes for future datetime",
    validationOk ? "pass" : "fail",
  );

  const { data: visitId, error: requestError } = await buyerClient.rpc("request_visit", {
    p_inquiry_id: targetInquiryId,
    p_requested_at: new Date(localFirst).toISOString(),
    p_requested_at_second: new Date(futureLocal(72)).toISOString(),
    p_message: `${PREFIX} visit message`,
  });

  record(
    checks,
    "7. visit request success via RPC",
    !requestError && visitId ? "pass" : "fail",
    requestError?.message ?? String(visitId),
  );

  if (!visitId) {
    finish(checks);
    return;
  }

  const { data: inquiryAfter } = await buyerClient
    .from("inquiries")
    .select("status")
    .eq("id", targetInquiryId)
    .single();

  record(
    checks,
    "8. inquiry status visit_requested after request",
    inquiryAfter?.status === "visit_requested" ? "pass" : "fail",
    inquiryAfter?.status,
  );

  const { error: duplicateError } = await buyerClient.rpc("request_visit", {
    p_inquiry_id: targetInquiryId,
    p_requested_at: futureIso(96),
    p_message: `${PREFIX} duplicate`,
  });

  record(
    checks,
    "9. duplicate visit request rejected",
    duplicateError ? "pass" : "fail",
    duplicateError?.message,
  );

  record(
    checks,
    "10. redirect target visit id available",
    typeof visitId === "string" && visitId.length > 0 ? "pass" : "fail",
    `/buyer/visits/${visitId}`,
  );

  finish(checks);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

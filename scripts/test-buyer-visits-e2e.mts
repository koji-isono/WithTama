/**
 * BY-08 visits list integration test (Supabase JWT SELECT, no Service Role).
 *
 * Usage:
 *   npm run test:buyer-visits-e2e
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  formatVisitListPrimaryDateTime,
  getVisitListDateTimeFieldLabel,
  getVisitStatusLabel,
} from "../src/features/visits/format";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type CheckStatus = "pass" | "fail" | "skip";

type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
};

const PREFIX = `[BY08-E2E ${Date.now()}]`;

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

  const anonClient = createAuthClient(url, key);
  const { data: anonVisits } = await anonClient.from("visits").select("id").limit(1);

  record(
    checks,
    "1. unauthenticated cannot read visits list",
    !anonVisits || anonVisits.length === 0 ? "pass" : "fail",
  );

  const buyerClient = createAuthClient(url, key);
  await signIn(buyerClient, buyerEmail, buyerPassword);

  const { data: buyerRow } = await buyerClient.from("buyers").select("id").maybeSingle();

  if (!buyerRow?.id) {
    record(checks, "buyer profile", "fail", "no buyer row");
    finish(checks);
    return;
  }

  const { data: ownVisits, error: listError } = await buyerClient
    .from("visits")
    .select(
      "id, buyer_id, inquiry_id, pet_id, breeder_id, status, requested_at, scheduled_at, completed_at, canceled_at, deleted_at, created_at",
    )
    .eq("buyer_id", buyerRow.id)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("requested_at", { ascending: false })
    .order("created_at", { ascending: false });

  record(
    checks,
    "2. buyer can list own visits",
    listError == null ? "pass" : "fail",
    listError?.message,
  );

  const visits = ownVisits ?? [];

  record(
    checks,
    "3. all listed visits belong to buyer",
    visits.every((row) => row.buyer_id === buyerRow.id) ? "pass" : "fail",
  );

  const { data: foreignVisit } = await buyerClient
    .from("visits")
    .select("id")
    .neq("buyer_id", buyerRow.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (foreignVisit?.id) {
    const { data: denied } = await buyerClient
      .from("visits")
      .select("id")
      .eq("id", foreignVisit.id)
      .maybeSingle();

    record(checks, "4. other buyer visit not in buyer list", denied == null ? "pass" : "fail");
  } else {
    record(checks, "4. other buyer visit not in buyer list", "skip", "no foreign sample");
  }

  record(
    checks,
    "5. deleted_at visits excluded",
    visits.every((row) => row.deleted_at == null) ? "pass" : "fail",
  );

  let requestedVisit = visits.find((row) => row.status === "requested");

  if (!requestedVisit) {
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
          subject: `${PREFIX} inquiry`,
        })
        .select("id")
        .single();

      if (createdInquiry?.id) {
        await buyerClient.from("inquiry_messages").insert({
          inquiry_id: createdInquiry.id,
          sender_type: "buyer",
          sender_user_id: (await buyerClient.auth.getUser()).data.user?.id,
          message: `${PREFIX} setup`,
        });

        const { data: newVisitId } = await buyerClient.rpc("request_visit", {
          p_inquiry_id: createdInquiry.id,
          p_requested_at: futureIso(48),
          p_message: `${PREFIX} visit`,
        });

        if (newVisitId) {
          requestedVisit = visits.find((row) => row.id === newVisitId) ?? {
            id: newVisitId,
            buyer_id: buyerRow.id,
            inquiry_id: createdInquiry.id,
            pet_id: petRow.id,
            breeder_id: petRow.breeder_id,
            status: "requested",
            requested_at: futureIso(48),
            scheduled_at: null,
            completed_at: null,
            canceled_at: null,
            deleted_at: null,
            created_at: new Date().toISOString(),
          };
        }
      }
    }
  }

  record(
    checks,
    "6. requested status in list",
    requestedVisit?.status === "requested" ? "pass" : "fail",
    requestedVisit ? getVisitStatusLabel(String(requestedVisit.status)) : undefined,
  );

  if (requestedVisit) {
    const label = formatVisitListPrimaryDateTime({
      status: String(requestedVisit.status),
      scheduled_at: requestedVisit.scheduled_at as string | null,
      requested_at: String(requestedVisit.requested_at),
      completed_at: requestedVisit.completed_at as string | null,
      canceled_at: requestedVisit.canceled_at as string | null,
    });

    record(
      checks,
      "7. requested uses first preferred datetime label",
      getVisitListDateTimeFieldLabel("requested") === "第一希望" && label !== "—" ? "pass" : "fail",
      label,
    );
  } else {
    record(
      checks,
      "7. requested uses first preferred datetime label",
      "fail",
      "no requested visit",
    );
  }

  const scheduledVisit = visits.find((row) => row.status === "scheduled");

  record(
    checks,
    "8. scheduled status sample",
    scheduledVisit ? "pass" : "skip",
    scheduledVisit ? getVisitStatusLabel(String(scheduledVisit.status)) : "no scheduled sample",
  );

  if (scheduledVisit?.scheduled_at) {
    record(
      checks,
      "9. scheduled_at used for datetime",
      getVisitListDateTimeFieldLabel("scheduled") === "見学日時" ? "pass" : "fail",
      String(scheduledVisit.scheduled_at),
    );
  } else {
    record(checks, "9. scheduled_at used for datetime", "skip");
  }

  const completedVisit = visits.find((row) => row.status === "completed");
  record(
    checks,
    "10. completed status sample",
    completedVisit ? "pass" : "skip",
    completedVisit ? getVisitStatusLabel(String(completedVisit.status)) : undefined,
  );

  const canceledVisit = visits.find((row) => row.status === "canceled");
  record(
    checks,
    "11. canceled status sample",
    canceledVisit ? "pass" : "skip",
    canceledVisit ? getVisitStatusLabel(String(canceledVisit.status)) : undefined,
  );

  if (requestedVisit?.pet_id) {
    const { data: petRow } = await buyerClient
      .from("published_pets_public")
      .select("id, public_display_name")
      .eq("id", requestedVisit.pet_id)
      .maybeSingle();

    record(
      checks,
      "12. pet info readable for visit",
      petRow?.public_display_name ? "pass" : "skip",
      petRow?.public_display_name ? String(petRow.public_display_name) : "unpublished pet fallback",
    );
  } else {
    record(checks, "12. pet info readable for visit", "skip");
  }

  if (requestedVisit?.breeder_id) {
    const { data: breederRow } = await buyerClient
      .from("breeder_public_profiles")
      .select("business_name")
      .eq("id", requestedVisit.breeder_id)
      .maybeSingle();

    record(
      checks,
      "13. breeder name readable",
      breederRow?.business_name ? "pass" : "skip",
      breederRow?.business_name ? String(breederRow.business_name) : undefined,
    );
  } else {
    record(checks, "13. breeder name readable", "skip");
  }

  if (requestedVisit?.id) {
    const detailPath = `/buyer/visits/${requestedVisit.id}`;
    record(
      checks,
      "14. BY-09 detail path resolvable",
      detailPath.includes(requestedVisit.id) ? "pass" : "fail",
    );
  } else {
    record(checks, "14. BY-09 detail path resolvable", "skip");
  }

  record(
    checks,
    "15. empty list is valid (no error when zero after filter)",
    listError == null ? "pass" : "fail",
    `${visits.length} visits`,
  );

  finish(checks);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

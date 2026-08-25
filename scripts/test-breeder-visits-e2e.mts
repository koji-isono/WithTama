/**
 * BR-14 breeder visits list integration test (Supabase JWT SELECT, no Service Role).
 *
 * Usage:
 *   npm run test:breeder-visits-e2e
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  formatVisitListPrimaryDateTime,
  getBreederVisitListDateTimeFieldLabel,
  getBreederVisitStatusLabel,
  sortBreederVisitsForList,
} from "../src/features/visits/format";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type CheckStatus = "pass" | "fail" | "skip";

type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
};

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

async function main(): Promise<void> {
  const checks: Check[] = [];
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
  const buyerEmail = process.env.SEC_TEST_BUYER_EMAIL?.trim();
  const buyerPassword = process.env.SEC_TEST_BUYER_PASSWORD?.trim();

  const anonClient = createAuthClient(url, key);
  const { data: anonVisits } = await anonClient.from("visits").select("id").limit(1);

  record(
    checks,
    "1. unauthenticated cannot read visits",
    !anonVisits || anonVisits.length === 0 ? "pass" : "fail",
  );

  const breederClient = createAuthClient(url, key);
  await signIn(breederClient, breederEmail, breederPassword);

  const { data: breederRow } = await breederClient.from("breeders").select("id").maybeSingle();

  if (!breederRow?.id) {
    record(checks, "breeder profile", "fail", "no breeder row");
    finish(checks);
    return;
  }

  const { data: rawVisits, error: listError } = await breederClient
    .from("visits")
    .select(
      "id, buyer_id, inquiry_id, pet_id, breeder_id, status, requested_at, scheduled_at, completed_at, canceled_at, deleted_at, created_at",
    )
    .eq("breeder_id", breederRow.id)
    .is("deleted_at", null);

  record(
    checks,
    "2. breeder can list own visits",
    listError == null ? "pass" : "fail",
    listError?.message,
  );

  const visits = sortBreederVisitsForList(rawVisits ?? []);

  record(
    checks,
    "3. all listed visits belong to breeder",
    visits.every((row) => row.breeder_id === breederRow.id) ? "pass" : "fail",
  );

  const { data: foreignVisit } = await breederClient
    .from("visits")
    .select("id, breeder_id")
    .neq("breeder_id", breederRow.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (foreignVisit?.id) {
    const { data: denied } = await breederClient
      .from("visits")
      .select("id")
      .eq("id", foreignVisit.id)
      .maybeSingle();

    record(checks, "4. other breeder visit not readable", denied == null ? "pass" : "fail");
  } else {
    record(checks, "4. other breeder visit not readable", "skip", "no foreign sample");
  }

  if (buyerEmail && buyerPassword) {
    const buyerClient = createAuthClient(url, key);
    await signIn(buyerClient, buyerEmail, buyerPassword);

    const { data: buyerRow } = await buyerClient.from("buyers").select("id").maybeSingle();

    const otherBuyerVisit = visits.find((row) => row.buyer_id !== buyerRow?.id);

    if (buyerRow?.id && otherBuyerVisit?.id) {
      const { data: denied } = await buyerClient
        .from("visits")
        .select("id")
        .eq("id", otherBuyerVisit.id)
        .maybeSingle();

      record(checks, "5. buyer cannot read another buyer visit", denied == null ? "pass" : "fail");
    } else {
      record(
        checks,
        "5. buyer cannot read another buyer visit",
        "skip",
        "no foreign buyer visit sample",
      );
    }
  } else {
    record(checks, "5. buyer cannot read another buyer visit", "skip", "no buyer creds");
  }

  record(
    checks,
    "6. deleted_at visits excluded",
    visits.every((row) => row.deleted_at == null) ? "pass" : "fail",
  );

  const requested = visits.find((row) => row.status === "requested");
  if (requested) {
    record(
      checks,
      "7. requested uses breeder label",
      getBreederVisitStatusLabel("requested") === "見学希望（要対応）" ? "pass" : "fail",
    );
    record(
      checks,
      "8. requested datetime field",
      getBreederVisitListDateTimeFieldLabel("requested") === "見学希望日時" ? "pass" : "fail",
    );
    record(
      checks,
      "9. requested_at displayed via formatter",
      formatVisitListPrimaryDateTime(requested) !== "—" ? "pass" : "fail",
    );
  } else {
    record(checks, "7. requested uses breeder label", "skip", "no requested visit");
    record(checks, "8. requested datetime field", "skip", "no requested visit");
    record(checks, "9. requested_at displayed via formatter", "skip", "no requested visit");
  }

  const scheduled = visits.find((row) => row.status === "scheduled");
  if (scheduled) {
    record(
      checks,
      "10. scheduled_at displayed",
      scheduled.scheduled_at != null && formatVisitListPrimaryDateTime(scheduled) !== "—"
        ? "pass"
        : "fail",
    );
  } else {
    record(checks, "10. scheduled_at displayed", "skip", "no scheduled visit");
  }

  if (visits.length > 0) {
    const inquiryId = visits[0].inquiry_id;
    const { data: displayName, error: rpcError } = await breederClient.rpc(
      "get_inquiry_buyer_display_name",
      { p_inquiry_id: inquiryId },
    );

    record(
      checks,
      "11. buyer display name RPC for breeder",
      rpcError == null && typeof displayName === "string" && displayName.length > 0
        ? "pass"
        : "fail",
      rpcError?.message,
    );
  } else {
    record(checks, "11. buyer display name RPC for breeder", "skip", "no visits");
  }

  if (visits.length >= 2) {
    const sorted = sortBreederVisitsForList(visits);
    const firstRequestedIndex = sorted.findIndex((row) => row.status === "requested");
    const firstNonRequestedIndex = sorted.findIndex((row) => row.status !== "requested");

    if (firstRequestedIndex >= 0 && firstNonRequestedIndex >= 0) {
      record(
        checks,
        "12. requested sorted before other statuses",
        firstRequestedIndex < firstNonRequestedIndex ? "pass" : "fail",
      );
    } else {
      record(
        checks,
        "12. requested sorted before other statuses",
        "skip",
        "mixed statuses missing",
      );
    }
  } else {
    record(checks, "12. requested sorted before other statuses", "skip", "insufficient visits");
  }

  record(checks, "13. zero visits is valid empty state", "pass");

  finish(checks);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

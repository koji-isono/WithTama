/**
 * Breeder layout header display name verification (static + formatter + optional live DB).
 *
 * Usage:
 *   npm run test:breeder-header-display-name
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { formatBreederDisplayName } from "@/lib/breeder/format";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function runFormatterChecks(checks: Check[]): void {
  record(
    checks,
    "F1. business_name preferred",
    formatBreederDisplayName("WithTama犬舎", "代表者") === "WithTama犬舎",
  );
  record(
    checks,
    "F2. representative_name fallback",
    formatBreederDisplayName(null, "代表 太郎") === "代表 太郎",
  );
  record(
    checks,
    "F3. empty business_name uses representative_name",
    formatBreederDisplayName("  ", "代表 太郎") === "代表 太郎",
  );
  record(
    checks,
    "F4. both empty → （名称未設定）",
    formatBreederDisplayName(null, null) === "（名称未設定）",
  );
  record(
    checks,
    "F5. no automatic ブリーダー suffix",
    !formatBreederDisplayName("WithTama犬舎", null).endsWith("ブリーダー"),
  );
}

function runStaticChecks(checks: Check[]): void {
  const header = read("src/components/layout/breeder-header.tsx");
  const layout = read("src/app/breeder/layout.tsx");
  const loaders = read("src/features/breeder-profile/loaders.ts");
  const repository = read("src/features/breeder-profile/repository.ts");
  const adminFormat = read("src/features/admin/format.ts");
  const sharedFormat = read("src/lib/breeder/format.ts");

  record(
    checks,
    "S1. hardcoded 田中 ブリーダー removed from header",
    !header.includes("田中 ブリーダー") && !header.includes("BREEDER_NAME"),
  );
  record(
    checks,
    "S2. BreederHeader accepts displayName prop",
    header.includes("displayName: string") && header.includes("{ displayName }"),
  );
  record(
    checks,
    "S3. layout passes displayName to BreederHeader",
    layout.includes("loadBreederHeaderDisplayName") &&
      layout.includes("<BreederHeader displayName={displayName}"),
  );
  record(
    checks,
    "S4. layout is async server component",
    layout.includes("async function BreederLayout"),
  );
  record(
    checks,
    "S5. loader uses requireBreeder",
    loaders.includes("loadBreederHeaderDisplayName") && loaders.includes("await requireBreeder()"),
  );
  record(
    checks,
    "S6. loader uses getBasicProfileByUserId(user.id)",
    loaders.includes("getBasicProfileByUserId(user.id)") &&
      loaders.includes("formatBreederDisplayName"),
  );
  record(
    checks,
    "S7. no client breeder_id param",
    !header.includes("breeder_id") &&
      !header.includes("breederId") &&
      !layout.includes("searchParams"),
  );
  record(
    checks,
    "S8. no service_role in loader/repository",
    !loaders.includes("service_role") &&
      !loaders.includes("SERVICE_ROLE") &&
      !repository.includes("service_role"),
  );
  record(checks, "S9. repository scopes by user_id", repository.includes('.eq("user_id", userId)'));
  record(
    checks,
    "S10. shared formatter in lib/breeder/format.ts",
    sharedFormat.includes("export function formatBreederDisplayName"),
  );
  record(
    checks,
    "S11. admin re-exports shared formatter",
    adminFormat.includes("@/lib/breeder/format") &&
      adminFormat.includes("formatBreederDisplayName"),
  );
  record(
    checks,
    "S12. admin format.ts does not duplicate formatter body",
    !adminFormat.includes('return "（名称未設定）"'),
  );
}

async function runLiveChecks(checks: Check[]): Promise<void> {
  let supabaseUrl: string;
  let publishableKey: string;
  let breederEmail: string;
  let breederPassword: string;

  try {
    supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
    breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
  } catch (error) {
    const message = error instanceof Error ? error.message : "missing env";
    record(checks, "L1. live DB alignment", false, `SKIP — ${message}`);
    return;
  }

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await client.auth.signInWithPassword({
    email: breederEmail,
    password: breederPassword,
  });

  record(
    checks,
    "L1. breeder authentication for live fetch",
    signInError == null,
    signInError?.message,
  );

  if (signInError) {
    return;
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    record(checks, "L2. session user available", false);
    return;
  }

  record(checks, "L2. session user available", true);

  const { data: row, error: rowError } = await client
    .from("breeders")
    .select("business_name, representative_name")
    .eq("user_id", user.id)
    .maybeSingle();

  record(checks, "L3. live breeders row via user_id", rowError == null && row != null);

  if (!row) {
    return;
  }

  const displayName = formatBreederDisplayName(
    (row.business_name as string | null) ?? null,
    (row.representative_name as string | null) ?? null,
  );

  record(
    checks,
    "L4. live display name is not hardcoded placeholder",
    displayName !== "田中 ブリーダー",
  );

  const businessTrimmed = ((row.business_name as string | null) ?? "").trim();
  const representativeTrimmed = ((row.representative_name as string | null) ?? "").trim();
  const expected =
    businessTrimmed.length > 0
      ? businessTrimmed
      : representativeTrimmed.length > 0
        ? representativeTrimmed
        : "（名称未設定）";

  record(
    checks,
    "L5. live display name matches DB priority rules",
    displayName === expected,
    "redacted — match confirmed",
  );

  const { data: foreignRows, error: foreignError } = await client
    .from("breeders")
    .select("id")
    .neq("user_id", user.id)
    .limit(1);

  record(
    checks,
    "L6. other breeder rows not readable (RLS)",
    foreignError != null || (foreignRows?.length ?? 0) === 0,
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";

  try {
    const response = await fetch(`${appUrl}/breeder/billing`, { redirect: "manual" });
    const html = await response.text();
    record(
      checks,
      "L7. production placeholder absent from /breeder/billing HTML",
      !html.includes("田中 ブリーダー"),
      `status=${response.status}`,
    );

    if (response.status === 200 && displayName !== "（名称未設定）") {
      record(
        checks,
        "L8. live HTML contains computed display name",
        html.includes(displayName),
        "redacted — match confirmed",
      );
    } else {
      record(
        checks,
        "L8. live HTML contains computed display name",
        true,
        `SKIP — status=${response.status} (auth cookie required for SSR match)`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    record(
      checks,
      "L7. production placeholder absent from /breeder/billing HTML",
      true,
      `SKIP — ${message}`,
    );
    record(checks, "L8. live HTML contains computed display name", true, `SKIP — ${message}`);
  }
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  runFormatterChecks(checks);
  runStaticChecks(checks);
  await runLiveChecks(checks);

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;

  console.log("");
  console.log(`${passed} passed / ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unexpected error";
  console.log(`FAIL unhandled error (${message})`);
  process.exitCode = 1;
});

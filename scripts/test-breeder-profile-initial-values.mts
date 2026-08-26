/**
 * BR-09 Step 1 / 2 saved profile initial values verification.
 *
 * Usage:
 *   npm run test:breeder-profile-initial-values
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

import { isProfileEditable } from "../src/features/breeder-profile/edit-guard.ts";
import {
  mapBasicProfileRowOrEmpty,
  mapLocationProfileRowOrEmpty,
  mapRowToBasicProfileInput,
  mapRowToLocationProfileInput,
} from "../src/features/breeder-profile/profile-input-mappers.ts";
import {
  INITIAL_BASIC_PROFILE_INPUT,
  INITIAL_LOCATION_PROFILE_INPUT,
} from "../src/features/breeder-profile/types.ts";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const ROOT = process.cwd();
const basicProfileSelect = "business_name, representative_name, phone, public_email, website_url";
const locationProfileSelect = "postal_code, prefecture, city, address_line";

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function extractFunctionBody(source: string, functionName: string): string {
  const start = source.indexOf(`export async function ${functionName}`);
  if (start === -1) {
    return "";
  }

  const nextExport = source.indexOf("\nexport async function ", start + 1);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  const loaders = read("src/features/breeder-profile/loaders.ts");
  const repository = read("src/features/breeder-profile/repository.ts");
  const basicPage = read("src/app/breeder/profile/basic/page.tsx");
  const locationPage = read("src/app/breeder/profile/location/page.tsx");
  const basicForm = read("src/features/breeder-profile/components/basic-info-step-form.tsx");
  const locationForm = read("src/features/breeder-profile/components/location-step-form.tsx");
  const profileLayout = read("src/app/breeder/profile/layout.tsx");

  record(
    checks,
    "1. Step 1 loader exists",
    loaders.includes("export async function loadBasicProfile"),
  );
  record(
    checks,
    "2. Step 2 loader exists",
    loaders.includes("export async function loadLocationProfile"),
  );
  record(
    checks,
    "3. Step 1 repository getter exists",
    repository.includes("getBasicProfileByUserId") &&
      repository.includes("business_name, representative_name, phone, public_email, website_url"),
  );
  record(
    checks,
    "4. Step 2 repository getter exists",
    repository.includes("getLocationProfileByUserId") && repository.includes(locationProfileSelect),
  );
  record(
    checks,
    "5. basic repository scopes user_id",
    repository.match(/getBasicProfileByUserId[\s\S]*\.eq\("user_id", userId\)/),
  );
  record(
    checks,
    "6. location repository scopes user_id",
    repository.match(/getLocationProfileByUserId[\s\S]*\.eq\("user_id", userId\)/),
  );
  record(
    checks,
    "7. basic page uses loader",
    basicPage.includes("loadBasicProfile") && basicPage.includes("initialInput"),
  );
  record(
    checks,
    "8. location page uses loader",
    locationPage.includes("loadLocationProfile") && locationPage.includes("initialInput"),
  );
  record(
    checks,
    "9. BasicInfoStepForm accepts initialInput",
    basicForm.includes("initialInput") &&
      basicForm.includes("useState<BasicProfileInput>(initialInput)"),
  );
  record(
    checks,
    "10. LocationStepForm accepts initialInput",
    locationForm.includes("initialInput") &&
      locationForm.includes("useState<LocationProfileInput>(initialInput)"),
  );
  record(
    checks,
    "11. empty basic row returns INITIAL",
    JSON.stringify(mapBasicProfileRowOrEmpty(null)) === JSON.stringify(INITIAL_BASIC_PROFILE_INPUT),
  );
  record(
    checks,
    "12. empty location row returns INITIAL",
    JSON.stringify(mapLocationProfileRowOrEmpty(null)) ===
      JSON.stringify(INITIAL_LOCATION_PROFILE_INPUT),
  );
  record(
    checks,
    "13. mapper maps basic fields",
    mapRowToBasicProfileInput({
      business_name: "屋号A",
      representative_name: "代表B",
      phone: "090",
      public_email: "a@b.co",
      website_url: "https://example.com",
    }).businessName === "屋号A",
  );
  record(
    checks,
    "14. mapper maps location fields",
    mapRowToLocationProfileInput({
      postal_code: "100-0001",
      prefecture: "東京都",
      city: "千代田区",
      address_line: "1-1",
    }).prefecture === "東京都",
  );
  record(
    checks,
    "15. loaders use requireBreeder",
    loaders.match(/loadBasicProfile[\s\S]*requireBreeder/) &&
      loaders.match(/loadLocationProfile[\s\S]*requireBreeder/),
  );
  record(
    checks,
    "16. no review_status branch in basic loader",
    !extractFunctionBody(loaders, "loadBasicProfile").includes("review_status") &&
      !extractFunctionBody(loaders, "loadLocationProfile").includes("review_status"),
  );
  record(
    checks,
    "17. edit guard maintained in layout",
    profileLayout.includes("loadBreederProfilePageContext") &&
      profileLayout.includes("resubmissionNotice"),
  );
  record(
    checks,
    "18. resubmission_required editable",
    isProfileEditable("resubmission_required") && isProfileEditable("draft"),
  );
  record(
    checks,
    "19. submitted not editable",
    !isProfileEditable("submitted") && !isProfileEditable("under_review"),
  );
  record(
    checks,
    "20. no service role in repository",
    !repository.includes("createServiceRoleClient") && !repository.includes("service_role"),
  );
  record(
    checks,
    "21. no migration or RPC in repository",
    !repository.includes("CREATE OR REPLACE FUNCTION") && !repository.includes("CREATE POLICY"),
  );
  record(
    checks,
    "22. save actions unchanged in service",
    read("src/features/breeder-profile/service.ts").includes("saveBasicProfile") &&
      read("src/features/breeder-profile/service.ts").includes("saveLocationProfile"),
  );

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await client.auth.signInWithPassword({
    email: breederEmail,
    password: breederPassword,
  });
  record(
    checks,
    "23. breeder authentication for live fetch",
    signInError == null,
    signInError?.message,
  );

  const {
    data: { user },
  } = await client.auth.getUser();

  if (user) {
    const { data: basicRow, error: basicError } = await client
      .from("breeders")
      .select(basicProfileSelect)
      .eq("user_id", user.id)
      .maybeSingle();

    record(checks, "24. live basic profile fetch", basicError == null && basicRow != null);

    if (basicRow) {
      const mapped = mapRowToBasicProfileInput(basicRow);
      record(
        checks,
        "25. live business_name mapped",
        mapped.businessName.length > 0,
        mapped.businessName,
      );
      record(
        checks,
        "26. live representative_name mapped",
        mapped.representativeName.length > 0,
        mapped.representativeName,
      );
      record(checks, "27. live phone mapped", mapped.phone.length > 0, mapped.phone);
    } else {
      record(checks, "25. live business_name mapped", false, "no row");
      record(checks, "26. live representative_name mapped", false, "no row");
      record(checks, "27. live phone mapped", false, "no row");
    }

    const { data: locationRow, error: locationError } = await client
      .from("breeders")
      .select(locationProfileSelect)
      .eq("user_id", user.id)
      .maybeSingle();

    record(checks, "28. live location profile fetch", locationError == null && locationRow != null);

    if (locationRow) {
      const mapped = mapRowToLocationProfileInput(locationRow);
      record(
        checks,
        "29. live postal_code mapped",
        mapped.postalCode.length > 0,
        mapped.postalCode,
      );
      record(checks, "30. live prefecture mapped", mapped.prefecture.length > 0, mapped.prefecture);
      record(checks, "31. live city mapped", mapped.city.length > 0, mapped.city);
      record(
        checks,
        "32. live address_line mapped",
        mapped.addressLine.length > 0,
        mapped.addressLine,
      );
    } else {
      record(checks, "29. live postal_code mapped", false, "no row");
      record(checks, "30. live prefecture mapped", false, "no row");
      record(checks, "31. live city mapped", false, "no row");
      record(checks, "32. live address_line mapped", false, "no row");
    }

    const { data: foreignRows } = await client
      .from("breeders")
      .select("id")
      .neq("user_id", user.id)
      .limit(1);

    const foreignId = foreignRows?.[0]?.id;
    if (foreignId) {
      const { data: foreignBasic } = await client
        .from("breeders")
        .select(basicProfileSelect)
        .eq("id", foreignId)
        .maybeSingle();
      record(checks, "33. other breeder basic row not readable", foreignBasic == null);
    } else {
      record(checks, "33. other breeder basic row not readable", true, "no foreign row to probe");
    }
  } else {
    for (let i = 24; i <= 33; i++) {
      record(checks, `${i}. live fetch skipped`, false, "no user");
    }
  }

  const failed = checks.filter((check) => !check.passed);
  console.log("");
  console.log(`${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

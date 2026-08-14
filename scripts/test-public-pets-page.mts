/**
 * PU-01 public pets page display verification (anon, publishable key).
 *
 * Verifies published_pets_public + breeder_public_profiles + main photo Signed URL
 * are usable for the /pets list page data path.
 *
 * Usage:
 *   npm run test:public-pets-page
 */

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const PET_PHOTOS_BUCKET = "pet-photos";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const anon = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: pets, error: petsError } = await anon
    .from("published_pets_public")
    .select("id, public_display_name, breeder_id, price")
    .order("public_display_name", { ascending: true })
    .limit(20);

  record(
    checks,
    "published_pets_public rows loadable for page list",
    petsError == null,
    petsError?.message,
  );

  const firstPet = pets?.[0];

  record(
    checks,
    "at least one published pet available for page display",
    firstPet != null,
    firstPet?.id ?? "no rows",
  );

  if (!firstPet) {
    summarize(checks);
    process.exitCode = 1;
    return;
  }

  const { data: breeder, error: breederError } = await anon
    .from("breeder_public_profiles")
    .select("id, business_name, prefecture")
    .eq("id", firstPet.breeder_id)
    .maybeSingle();

  record(
    checks,
    "breeder_public_profiles joinable for first pet",
    breederError == null && breeder != null,
    breederError?.message ?? firstPet.breeder_id,
  );

  const { data: photos, error: photosError } = await anon
    .from("pet_photos")
    .select("storage_path")
    .eq("pet_id", firstPet.id)
    .eq("is_main", true)
    .limit(1);

  record(
    checks,
    "main photo row loadable for first pet",
    photosError == null,
    photosError?.message,
  );

  const storagePath = photos?.[0]?.storage_path as string | undefined;

  if (storagePath) {
    const { data: signed, error: signedError } = await anon.storage
      .from(PET_PHOTOS_BUCKET)
      .createSignedUrl(storagePath, 60);

    record(
      checks,
      "main photo signed url creatable for page display",
      signedError == null && Boolean(signed?.signedUrl),
      signedError?.message,
    );
  } else {
    record(
      checks,
      "main photo signed url creatable for page display",
      true,
      "skipped (no main photo — page shows placeholder)",
    );
  }

  record(
    checks,
    "public_display_name present for card title",
    Boolean(firstPet.public_display_name?.trim()),
    firstPet.public_display_name ?? "empty",
  );

  summarize(checks);

  if (checks.some((check) => !check.passed)) {
    process.exitCode = 1;
  }
}

function summarize(checks: Check[]): void {
  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;
  console.log("");
  console.log(`${passed} passed / ${failed} failed`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * Stripe Step 2 — SDK / server config verification.
 *
 * Does not call Stripe API or perform billing operations.
 *
 * Requires (for full PASS):
 *   STRIPE_SECRET_KEY
 *   STRIPE_BREEDER_PRICE_ID
 *   STRIPE_BREEDER_TAX_RATE_ID
 *
 * Usage:
 *   npm run test:stripe-step2-server-config
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
  skipped?: boolean;
};

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

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      collectSourceFiles(full, acc);
    } else if (/\.(ts|tsx|js|jsx|mts)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function assertSafeErrorMessage(message: string, forbidden: string[]): boolean {
  const lower = message.toLowerCase();
  return !forbidden.some((part) => part && lower.includes(part.toLowerCase()));
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const root = process.cwd();
  const stripeLibDir = join(root, "src/lib/stripe");

  // 1. Stripe SDK package
  try {
    const stripeMod = await import("stripe");
    const StripeCtor = stripeMod.default;
    record(checks, "1. stripe SDK importable", Boolean(StripeCtor));
  } catch (error) {
    record(
      checks,
      "1. stripe SDK importable",
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  // 2. Config module (env.ts — runtime; config.ts adds server-only for Next.js)
  const configSource = readFileSync(join(stripeLibDir, "config.ts"), "utf8");
  const serverSource = readFileSync(join(stripeLibDir, "server.ts"), "utf8");

  let envMod: typeof import("../src/lib/stripe/env.ts") | null = null;
  try {
    envMod = await import("../src/lib/stripe/env.ts");
    record(checks, "2. stripe env module loadable", true);
  } catch (error) {
    record(
      checks,
      "2. stripe env module loadable",
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  record(
    checks,
    "2b. config.ts re-exports via server-only",
    configSource.includes('import "server-only"') && configSource.includes('from "./env"'),
  );

  // 3. server-only in config.ts / server.ts
  record(checks, "3. config.ts uses server-only", configSource.includes('import "server-only"'));
  record(checks, "4. server.ts uses server-only", serverSource.includes('import "server-only"'));

  // 5. No fee hardcode in stripe lib
  const noHardcodedFee =
    !/\b5000\b/.test(configSource) &&
    !/\b5000\b/.test(serverSource) &&
    !/\b5000\b/.test(readFileSync(join(stripeLibDir, "env.ts"), "utf8")) &&
    !/5_000/.test(configSource) &&
    !/5_000/.test(serverSource);
  record(checks, "5. no breeder fee hardcode in stripe lib", noHardcodedFee);

  // 6. No NEXT_PUBLIC stripe secret pattern in src/
  const srcFiles = collectSourceFiles(join(root, "src"));
  const publicSecretHits: string[] = [];
  for (const file of srcFiles) {
    const content = readFileSync(file, "utf8");
    if (/NEXT_PUBLIC_STRIPE_SECRET/i.test(content)) {
      publicSecretHits.push(relative(root, file));
    }
  }
  record(
    checks,
    "6. no NEXT_PUBLIC_STRIPE_SECRET in src/",
    publicSecretHits.length === 0,
    publicSecretHits.length > 0 ? publicSecretHits.join(", ") : "none",
  );

  if (!envMod) {
    skip(checks, "7–12. env getter tests", "env module failed to load");
    finish(checks);
    return;
  }

  const savedSecret = process.env.STRIPE_SECRET_KEY;
  const savedPriceId = process.env.STRIPE_BREEDER_PRICE_ID;
  const savedTaxRateId = process.env.STRIPE_BREEDER_TAX_RATE_ID;
  const fakeSecret = "sk_test_step2_fake_secret_for_safe_error_check";
  const fakePriceId = "price_step2_fake_price_id_for_test";
  const fakeTaxRateId = "txr_step2_fake_tax_rate_for_test";

  try {
    // 7. Missing STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_BREEDER_PRICE_ID = fakePriceId;
    let missingSecretOk = false;
    try {
      envMod.getStripeSecretKey();
    } catch (error) {
      if (error instanceof envMod.StripeConfigError && error.envVar === "STRIPE_SECRET_KEY") {
        missingSecretOk = assertSafeErrorMessage(error.message, [
          fakeSecret,
          fakePriceId,
          "sk_test",
        ]);
      }
    }
    record(checks, "7. missing STRIPE_SECRET_KEY fails safely", missingSecretOk);

    // 8. Missing STRIPE_BREEDER_PRICE_ID
    process.env.STRIPE_SECRET_KEY = fakeSecret;
    delete process.env.STRIPE_BREEDER_PRICE_ID;
    let missingPriceOk = false;
    try {
      envMod.getStripeBreederPriceId();
    } catch (error) {
      if (error instanceof envMod.StripeConfigError && error.envVar === "STRIPE_BREEDER_PRICE_ID") {
        missingPriceOk = assertSafeErrorMessage(error.message, [
          fakeSecret,
          fakePriceId,
          "sk_test",
        ]);
      }
    }
    record(checks, "8. missing STRIPE_BREEDER_PRICE_ID fails safely", missingPriceOk);

    // 8b. Missing STRIPE_BREEDER_TAX_RATE_ID
    process.env.STRIPE_SECRET_KEY = fakeSecret;
    process.env.STRIPE_BREEDER_PRICE_ID = fakePriceId;
    delete process.env.STRIPE_BREEDER_TAX_RATE_ID;
    let missingTaxRateOk = false;
    try {
      envMod.getStripeBreederTaxRateId();
    } catch (error) {
      if (
        error instanceof envMod.StripeConfigError &&
        error.envVar === "STRIPE_BREEDER_TAX_RATE_ID"
      ) {
        missingTaxRateOk = assertSafeErrorMessage(error.message, [
          fakeSecret,
          fakePriceId,
          fakeTaxRateId,
          "sk_test",
        ]);
      }
    }
    record(checks, "8b. missing STRIPE_BREEDER_TAX_RATE_ID fails safely", missingTaxRateOk);

    // 9. isStripeServerConfigured
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_BREEDER_PRICE_ID;
    delete process.env.STRIPE_BREEDER_TAX_RATE_ID;
    record(
      checks,
      "9. isStripeServerConfigured false when unset",
      !envMod.isStripeServerConfigured(),
    );

    process.env.STRIPE_SECRET_KEY = fakeSecret;
    process.env.STRIPE_BREEDER_PRICE_ID = fakePriceId;
    process.env.STRIPE_BREEDER_TAX_RATE_ID = fakeTaxRateId;
    record(checks, "10. isStripeServerConfigured true when set", envMod.isStripeServerConfigured());

    // 11. Getters return trimmed values without leaking in errors
    record(
      checks,
      "11. getters return configured values",
      envMod.getStripeSecretKey() === fakeSecret &&
        envMod.getStripeBreederPriceId() === fakePriceId &&
        envMod.getStripeBreederTaxRateId() === fakeTaxRateId,
    );

    // 12. Stripe client constructible via same env as server.ts (no API call)
    try {
      const StripeCtor = (await import("stripe")).default;
      const client = new StripeCtor(envMod.getStripeSecretKey(), { typescript: true });
      const isStripeInstance =
        client !== null && typeof client === "object" && typeof client.customers === "object";
      record(checks, "12. Stripe server client constructible from env", isStripeInstance);
    } catch (error) {
      record(
        checks,
        "12. Stripe server client constructible from env",
        false,
        error instanceof Error ? error.message : String(error),
      );
    }
  } finally {
    if (savedSecret === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = savedSecret;
    }
    if (savedPriceId === undefined) {
      delete process.env.STRIPE_BREEDER_PRICE_ID;
    } else {
      process.env.STRIPE_BREEDER_PRICE_ID = savedPriceId;
    }
    if (savedTaxRateId === undefined) {
      delete process.env.STRIPE_BREEDER_TAX_RATE_ID;
    } else {
      process.env.STRIPE_BREEDER_TAX_RATE_ID = savedTaxRateId;
    }
  }

  finish(checks);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

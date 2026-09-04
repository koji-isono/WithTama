/**
 * Stripe Step 7 — Test Mode live Customer Portal Session (1 session).
 *
 * Requires .env.local:
 *   STRIPE_SECRET_KEY (sk_test_*)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Uses first breeder row with stripe_customer_id from DB (Test Mode customer).
 * Does NOT open browser. Prints Portal URL only (no secrets).
 *
 * Usage:
 *   npm run test:stripe-step7-portal-live
 */

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { buildBreederPortalReturnUrl } from "@/features/billing/portal-urls";
import { getStripeSecretKey } from "@/lib/stripe/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

type BreederPortalRow = {
  id: string;
  membership_status: string;
  stripe_customer_id: string | null;
};

async function main(): Promise<void> {
  const secret = getStripeSecretKey();
  if (!secret.startsWith("sk_test_")) {
    console.error("FAIL: STRIPE_SECRET_KEY must be Test Mode (sk_test_*)");
    process.exitCode = 1;
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: breeders, error } = await supabase
    .from("breeders")
    .select("id, membership_status, stripe_customer_id")
    .not("stripe_customer_id", "is", null)
    .in("membership_status", ["active", "suspended"])
    .limit(1);

  if (error || !breeders?.length) {
    console.error(
      "SKIP: No breeder with stripe_customer_id and active/suspended membership in DB.",
    );
    console.error("Complete a Test Mode Checkout first, then re-run.");
    process.exitCode = 0;
    return;
  }

  const breeder = breeders[0] as BreederPortalRow;
  const customerId = breeder.stripe_customer_id;
  if (!customerId) {
    console.error("FAIL: Selected breeder missing stripe_customer_id");
    process.exitCode = 1;
    return;
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret, { typescript: true });
  const returnUrl = buildBreederPortalReturnUrl();

  console.log("Creating Test Mode Customer Portal Session...");
  console.log(`Breeder membership_status: ${breeder.membership_status}`);
  console.log(`Return URL: ${returnUrl}`);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  if (!session.url) {
    console.error("FAIL: Portal Session created but url is missing");
    process.exitCode = 1;
    return;
  }

  if (!session.url.includes("billing.stripe.com")) {
    console.error("FAIL: Portal URL does not look like Stripe Customer Portal");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("PASS: Test Mode Portal Session created");
  console.log("Portal URL (open in browser to verify Dashboard settings):");
  console.log(session.url);
  console.log("");
  console.log("Stop here — verify Portal UI manually with the user.");
}

main().catch(() => {
  console.error("FAIL: Portal live test threw an error");
  process.exitCode = 1;
});

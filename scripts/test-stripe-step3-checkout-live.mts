/**
 * Stripe Step 3 — Test Mode live Checkout Session creation (1 session).
 *
 * Requires .env.local:
 *   STRIPE_SECRET_KEY (must be sk_test_*)
 *   STRIPE_BREEDER_PRICE_ID
 *   STRIPE_BREEDER_TAX_RATE_ID
 *
 * Does NOT complete payment in browser.
 *
 * Usage:
 *   npm run test:stripe-step3-checkout-live
 */

import nextEnv from "@next/env";

import { buildCheckoutSessionCreateParams } from "@/features/billing/checkout-session-params";
import {
  buildBreederCheckoutCancelUrl,
  buildBreederCheckoutSuccessUrl,
} from "@/features/billing/checkout-urls";
import {
  getStripeBreederPriceId,
  getStripeBreederTaxRateId,
  getStripeSecretKey,
} from "@/lib/stripe/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function resolveId(value: string | { id: string } | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

async function main(): Promise<void> {
  const secret = getStripeSecretKey();
  if (!secret.startsWith("sk_test_")) {
    console.error("FAIL: STRIPE_SECRET_KEY must be Test Mode (sk_test_*)");
    process.exitCode = 1;
    return;
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret, { typescript: true });
  const priceId = getStripeBreederPriceId();
  const taxRateId = getStripeBreederTaxRateId();

  const testBreederId = "00000000-0000-4000-8000-step3live01";

  const params = buildCheckoutSessionCreateParams({
    breederId: testBreederId,
    priceId,
    taxRateId,
    stripeCustomerId: null,
    customerEmail: "stripe-step3-live-test@withtama.invalid",
    successUrl: buildBreederCheckoutSuccessUrl(),
    cancelUrl: buildBreederCheckoutCancelUrl(),
  });

  if (params.automatic_tax !== undefined) {
    console.error("FAIL: create params must not use automatic_tax");
    process.exitCode = 1;
    return;
  }

  console.log("Creating Test Mode Checkout Session...");
  const session = await stripe.checkout.sessions.create(params);

  if (!session.url) {
    console.error("FAIL: Session created but url is missing");
    process.exitCode = 1;
    return;
  }

  const retrieved = await stripe.checkout.sessions.retrieve(session.id);

  if (retrieved.metadata?.breeder_id !== testBreederId) {
    console.error("FAIL: metadata.breeder_id mismatch");
    process.exitCode = 1;
    return;
  }

  if (retrieved.mode !== "subscription") {
    console.error("FAIL: session mode is not subscription");
    process.exitCode = 1;
    return;
  }

  if (retrieved.automatic_tax?.enabled === true) {
    console.error("FAIL: session uses automatic_tax (manual Tax Rate expected)");
    process.exitCode = 1;
    return;
  }

  const taxRate = await stripe.taxRates.retrieve(taxRateId);
  if (!taxRate.active) {
    console.error("FAIL: configured Tax Rate is not active in Stripe");
    process.exitCode = 1;
    return;
  }

  // tax_rates is not expandable on sessions.retrieve nor listLineItems in current Stripe API.
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ["data.price"],
  });

  const lineItem = lineItems.data[0];
  if (!lineItem) {
    console.error("FAIL: no line items returned for Checkout Session");
    process.exitCode = 1;
    return;
  }

  const linePriceId = resolveId(lineItem.price);
  if (linePriceId !== priceId) {
    console.error("FAIL: line item price does not match STRIPE_BREEDER_PRICE_ID");
    process.exitCode = 1;
    return;
  }

  const paramsTaxRates = params.line_items?.[0]?.tax_rates ?? [];
  if (!paramsTaxRates.includes(taxRateId)) {
    console.error("FAIL: create params did not include configured Tax Rate ID");
    process.exitCode = 1;
    return;
  }

  const appliedTaxRates = (lineItem.tax_rates ?? [])
    .map((rate) => resolveId(rate))
    .filter((id): id is string => Boolean(id));

  const taxAppliedOnLineItem =
    appliedTaxRates.includes(taxRateId) || (lineItem.amount_tax ?? 0) > 0;

  if (!taxAppliedOnLineItem) {
    console.error("FAIL: manual Tax Rate not reflected on Checkout line item");
    process.exitCode = 1;
    return;
  }

  console.log("PASS: Test Mode Checkout Session created");
  console.log(`Session ID: ${session.id}`);
  console.log(`metadata.breeder_id: ${retrieved.metadata?.breeder_id}`);
  console.log(`mode: ${retrieved.mode}`);
  console.log(`price id: ${linePriceId}`);
  console.log(`manual tax_rates in create params: yes`);
  console.log(
    `line item tax_rates ids: ${appliedTaxRates.length > 0 ? appliedTaxRates.join(", ") : "not returned (verified via amount_tax)"}`,
  );
  console.log(`tax rate active: ${taxRate.active}`);
  console.log(`tax rate inclusive: ${taxRate.inclusive}`);
  console.log(`line item amount_subtotal: ${lineItem.amount_subtotal ?? "n/a"}`);
  console.log(`line item amount_tax: ${lineItem.amount_tax ?? "n/a"}`);
  console.log(`line item amount_total: ${lineItem.amount_total ?? "n/a"}`);
  console.log("automatic_tax: not used");
  console.log("");
  console.log("Open this URL in a browser to complete Test Mode payment manually:");
  console.log(session.url);
  console.log("");
  console.log("Verify Checkout shows tax-exclusive base + 10% tax (expected total from Stripe).");
  console.log("Test card: 4242 4242 4242 4242 (any future expiry, any CVC)");
}

main().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

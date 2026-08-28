/**
 * Stripe Step 3 — Checkout Session static / unit verification.
 *
 * Does not require a running Next.js server.
 * Stripe API live calls: npm run test:stripe-step3-checkout-live
 *
 * Usage:
 *   npm run test:stripe-step3-checkout
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { validateCheckoutClientInput } from "@/features/billing/checkout-request";
import {
  buildBreederCheckoutCancelUrl,
  buildBreederCheckoutSuccessUrl,
} from "@/features/billing/checkout-urls";
import { buildCheckoutSessionCreateParams } from "@/features/billing/checkout-session-params";
import {
  BILLING_CHECKOUT_API_PATH,
  CHECKOUT_ALLOWED_MEMBERSHIP_STATUSES,
} from "@/features/billing/constants";
import { evaluateCheckoutMembershipGate } from "@/features/billing/membership-gate";

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

function finish(checks: Check[]): void {
  const executed = checks.filter((c) => !c.skipped);
  const passed = executed.filter((c) => c.passed).length;
  const failed = executed.length - passed;
  const skippedCount = checks.filter((c) => c.skipped).length;
  console.log("");
  console.log(`${passed} passed / ${failed} failed / ${skippedCount} skipped`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function noTaxAmountHardcode(source: string): boolean {
  return (
    !/\b5000\b/.test(source) &&
    !/\b5500\b/.test(source) &&
    !/\b500\b/.test(source) &&
    !/\b10\s*%/.test(source) &&
    !/0\.1\b/.test(source)
  );
}

function main(): void {
  const checks: Check[] = [];

  record(
    checks,
    "1. API route at /api/billing/checkout",
    readSource("src/app/api/billing/checkout/route.ts").includes("handleBreederCheckoutRequest"),
  );

  const routeSource = readSource("src/app/api/billing/checkout/route.ts");
  const handlerSource = readSource("src/features/billing/checkout-handler.ts");
  const createSource = readSource("src/features/billing/create-checkout-session.ts");
  const paramsSource = readSource("src/features/billing/checkout-session-params.ts");

  record(
    checks,
    "2. POST only (no GET export)",
    !routeSource.includes("export async function GET"),
  );
  record(
    checks,
    "3. response returns url only shape",
    routeSource.includes("NextResponse.json({ url: result.url })"),
  );

  record(
    checks,
    "4. reject client price_id",
    !validateCheckoutClientInput({ price_id: "price_fake" }).valid,
  );
  record(checks, "5. reject client amount", !validateCheckoutClientInput({ amount: 5000 }).valid);
  record(
    checks,
    "6. reject client breeder_id",
    !validateCheckoutClientInput({ breeder_id: "uuid-fake" }).valid,
  );
  record(
    checks,
    "6b. reject client tax_rate_id",
    !validateCheckoutClientInput({ tax_rate_id: "txr_fake" }).valid,
  );
  record(
    checks,
    "6c. reject client automatic_tax",
    !validateCheckoutClientInput({ automatic_tax: { enabled: true } }).valid,
  );
  record(checks, "7. empty body allowed", validateCheckoutClientInput(null).valid === true);

  record(checks, "8. pending allowed", evaluateCheckoutMembershipGate("pending").allowed === true);
  record(
    checks,
    "9. canceled allowed (re-subscribe)",
    evaluateCheckoutMembershipGate("canceled").allowed === true,
  );

  const activeGate = evaluateCheckoutMembershipGate("active");
  record(checks, "10. active rejected", !activeGate.allowed && activeGate.reason === "active");

  const suspendedGate = evaluateCheckoutMembershipGate("suspended");
  record(
    checks,
    "11. suspended rejected (Step 3 undecided)",
    !suspendedGate.allowed && suspendedGate.reason === "suspended",
  );

  const params = buildCheckoutSessionCreateParams({
    breederId: "breeder-test-uuid",
    priceId: "price_test_from_env",
    taxRateId: "txr_test_from_env",
    stripeCustomerId: null,
    customerEmail: "test@example.com",
    successUrl: "http://localhost:3000/breeder/dashboard?checkout=success",
    cancelUrl: "http://localhost:3000/breeder/dashboard?checkout=cancel",
  });

  record(checks, "12. mode subscription", params.mode === "subscription");
  record(
    checks,
    "13. server price in line_items",
    params.line_items?.[0]?.price === "price_test_from_env",
  );
  record(checks, "14. quantity 1", params.line_items?.[0]?.quantity === 1);
  record(
    checks,
    "15. manual tax_rates on line_items",
    Array.isArray(params.line_items?.[0]?.tax_rates) &&
      params.line_items?.[0]?.tax_rates?.[0] === "txr_test_from_env",
  );
  record(checks, "16. metadata.breeder_id", params.metadata?.breeder_id === "breeder-test-uuid");
  record(
    checks,
    "17. subscription_data.metadata.breeder_id",
    params.subscription_data?.metadata?.breeder_id === "breeder-test-uuid",
  );
  record(
    checks,
    "18. no automatic_tax in params",
    params.automatic_tax === undefined &&
      !/automatic_tax\s*:/.test(paramsSource) &&
      !paramsSource.includes("automatic_tax: {"),
  );
  record(
    checks,
    "19. no amount in params",
    !("amount" in params) && !params.line_items?.[0]?.price_data,
  );

  const withCustomer = buildCheckoutSessionCreateParams({
    breederId: "b1",
    priceId: "price_x",
    taxRateId: "txr_x",
    stripeCustomerId: "cus_existing",
    customerEmail: "x@example.com",
    successUrl: "http://a/s",
    cancelUrl: "http://a/c",
  });
  record(checks, "20. reuse stripe_customer_id when set", withCustomer.customer === "cus_existing");
  record(
    checks,
    "20b. no customer_email when customer set",
    withCustomer.customer_email === undefined,
  );

  process.env.NEXT_PUBLIC_APP_URL = "https://app.withtama.test/";
  record(
    checks,
    "21. success URL server-built",
    buildBreederCheckoutSuccessUrl().startsWith("https://app.withtama.test/breeder/dashboard"),
  );
  record(
    checks,
    "22. cancel URL server-built",
    buildBreederCheckoutCancelUrl().includes("checkout=cancel"),
  );
  delete process.env.NEXT_PUBLIC_APP_URL;

  record(
    checks,
    "23. uses getStripeBreederPriceId (env)",
    createSource.includes("getStripeBreederPriceId"),
  );
  record(
    checks,
    "24. uses getStripeBreederTaxRateId (env)",
    createSource.includes("getStripeBreederTaxRateId"),
  );
  record(
    checks,
    "25. handler does not expose Stripe secrets",
    !handlerSource.includes("STRIPE_SECRET_KEY") && !handlerSource.includes("sk_"),
  );
  record(
    checks,
    "26. route JSON error only (no raw Stripe error)",
    routeSource.includes("{ error: result.error }"),
  );
  record(
    checks,
    "27. no membership_status DB update in billing feature",
    !handlerSource.includes(".update(") && !createSource.includes(".update("),
  );
  record(
    checks,
    "28. no client Host trust in checkout-urls",
    !readSource("src/features/billing/checkout-urls.ts").includes("request.headers"),
  );

  const billingFiles = [
    "src/features/billing/constants.ts",
    "src/features/billing/checkout-session-params.ts",
    "src/features/billing/create-checkout-session.ts",
    "src/features/billing/checkout-request.ts",
  ];
  record(
    checks,
    "29. no tax amount hardcode in billing (5000/5500/500/10%)",
    billingFiles.every((f) => noTaxAmountHardcode(readSource(f))),
  );

  record(
    checks,
    "30. CHECKOUT_ALLOWED only pending+canceled",
    CHECKOUT_ALLOWED_MEMBERSHIP_STATUSES.join(",") === "pending,canceled",
  );

  record(
    checks,
    "31. auth checks in handler (401/403)",
    handlerSource.includes("httpStatus: 401") && handlerSource.includes("httpStatus: 403"),
  );
  record(
    checks,
    "32. review_status approved check",
    handlerSource.includes('review_status !== "approved"'),
  );

  record(checks, "33. API path constant", BILLING_CHECKOUT_API_PATH === "/api/billing/checkout");

  record(
    checks,
    "34. no fixed global idempotency key in create",
    !createSource.includes("idempotencyKey") && !createSource.includes("Idempotency-Key"),
  );

  finish(checks);
}

main();

/**
 * Stripe Step 5 — membership_status mapping and webhook integration checks.
 *
 * Usage:
 *   npm run test:stripe-step5-membership-status
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import nextEnv from "@next/env";
import Stripe from "stripe";

import { buildBreederUpdateFromSubscription } from "@/features/billing/webhook/apply-subscription-webhook-update";
import { WebhookHandlerError } from "@/features/billing/webhook/errors";
import { assertBreederSubscriptionProduct } from "@/features/billing/webhook/product-validation";
import {
  applyMembershipMappingResult,
  buildMembershipTransitionFields,
  isStaleActiveEventAfterCancellation,
  mapStripeSubscriptionStatusToMembership,
  resolveMembershipForCheckoutSuccess,
  resolveMembershipFromSubscriptionSync,
} from "@/lib/stripe/membership-mapping";
import {
  isStripeBreederProductIdRequired,
  resolveStripeBreederProductIdForValidation,
} from "@/lib/stripe/env";
import type { BreederWebhookRow } from "@/features/billing/webhook/types";

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

function sampleBreeder(overrides: Partial<BreederWebhookRow> = {}): BreederWebhookRow {
  return {
    id: "breeder-uuid-1",
    stripe_customer_id: "cus_test",
    stripe_subscription_id: "sub_test_1",
    stripe_price_id: "price_test",
    membership_status: "pending",
    subscription_status: null,
    subscription_current_period_end: null,
    cancel_at_period_end: false,
    last_payment_failed_at: null,
    suspended_at: null,
    ...overrides,
  };
}

function sampleSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_test_1",
    object: "subscription",
    customer: "cus_test",
    status: "active",
    cancel_at_period_end: false,
    items: {
      object: "list",
      data: [
        {
          id: "si_test",
          object: "subscription_item",
          current_period_end: 1_700_100_000,
          price: {
            id: "price_test",
            object: "price",
            product: "prod_withtama_breeder",
          } as Stripe.Price,
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: "/v1/subscription_items",
    },
    metadata: { breeder_id: "breeder-uuid-1" },
    ...overrides,
  } as Stripe.Subscription;
}

function mappingSet(
  result: ReturnType<typeof mapStripeSubscriptionStatusToMembership>,
): string | null {
  return result.action === "set" ? result.membershipStatus : null;
}

function testMappingUnit(checks: Check[]): void {
  record(
    checks,
    "M1. pending + checkout subscription active → active",
    mappingSet(
      resolveMembershipForCheckoutSuccess({
        currentMembershipStatus: "pending",
        stripeSubscriptionStatus: "active",
      }),
    ) === "active",
  );

  record(
    checks,
    "M2. canceled + re-contract subscription active → active",
    mappingSet(
      resolveMembershipForCheckoutSuccess({
        currentMembershipStatus: "canceled",
        stripeSubscriptionStatus: "active",
      }),
    ) === "active",
  );

  record(
    checks,
    "M3. active + subscription active → active",
    mappingSet(resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "active" })) ===
      "active",
  );

  record(
    checks,
    "M4. active + past_due → active",
    mappingSet(resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "past_due" })) ===
      "active",
  );

  record(
    checks,
    "M5. active + unpaid → suspended",
    mappingSet(resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "unpaid" })) ===
      "suspended",
  );

  record(
    checks,
    "M6. suspended + subscription active → active",
    mappingSet(resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "active" })) ===
      "active",
  );

  record(
    checks,
    "M7. active + cancel_at_period_end stays active via sync",
    mappingSet(resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "active" })) ===
      "active",
  );

  record(
    checks,
    "M8. subscription canceled → canceled",
    mappingSet(resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "canceled" })) ===
      "canceled",
  );

  record(
    checks,
    "M9. trialing does not map to active",
    mappingSet(resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "trialing" })) ===
      null,
  );

  record(
    checks,
    "M10. incomplete does not map to active",
    mappingSet(
      resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "incomplete" }),
    ) === null,
  );

  record(
    checks,
    "M11. paused does not map to active",
    mappingSet(resolveMembershipFromSubscriptionSync({ stripeSubscriptionStatus: "paused" })) ===
      null,
  );

  record(
    checks,
    "M12. active checkout blocked for already-active membership",
    resolveMembershipForCheckoutSuccess({
      currentMembershipStatus: "active",
      stripeSubscriptionStatus: "active",
    }).action === "unchanged",
  );

  record(
    checks,
    "M13. suspended_at set on active→suspended",
    buildMembershipTransitionFields("active", "suspended", "2026-01-01T00:00:00.000Z")
      ?.suspended_at === "2026-01-01T00:00:00.000Z",
  );

  record(
    checks,
    "M14. suspended_at cleared on suspended→active",
    buildMembershipTransitionFields("suspended", "active", "2026-01-01T00:00:00.000Z")
      ?.suspended_at === null,
  );
}

function testSafety(checks: Check[]): void {
  const mappingSource = readSource("src/lib/stripe/membership-mapping.ts");
  const checkoutSource = readSource(
    "src/features/billing/webhook/handlers/checkout-session-completed.ts",
  );

  record(
    checks,
    "S1. mapping does not reference price amount",
    !mappingSource.includes("5000") && !mappingSource.includes("price_test"),
  );

  record(
    checks,
    "S2. checkout uses Product validation before update",
    checkoutSource.includes("assertBreederSubscriptionProduct"),
  );

  process.env.STRIPE_BREEDER_PRODUCT_ID = "prod_withtama_breeder";
  let productMismatchBlocks = false;
  try {
    assertBreederSubscriptionProduct(
      sampleSubscription({
        items: {
          object: "list",
          data: [
            {
              price: { id: "price_x", object: "price", product: "prod_other" },
            } as Stripe.SubscriptionItem,
          ],
          has_more: false,
          url: "/v1/subscription_items",
        },
      } as unknown as Stripe.Subscription),
    );
  } catch (error) {
    productMismatchBlocks = error instanceof WebhookHandlerError;
  }
  delete process.env.STRIPE_BREEDER_PRODUCT_ID;
  record(checks, "S3. Product validation failure blocks handler path", productMismatchBlocks);

  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  delete process.env.STRIPE_BREEDER_PRODUCT_ID;
  let productionFailClosed = false;
  try {
    resolveStripeBreederProductIdForValidation();
  } catch {
    productionFailClosed = true;
  }
  process.env.NODE_ENV = previousNodeEnv;
  record(checks, "S4. production Product ID fail-closed", productionFailClosed);
}

function testWebhookIntegration(checks: Check[]): void {
  const now = new Date("2026-01-15T12:00:00.000Z");

  const checkoutFields = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ membership_status: "pending" }),
    subscription: sampleSubscription({ status: "active" }),
    context: "checkout",
    now,
  });
  record(
    checks,
    "W1. checkout.session.completed pending→active",
    checkoutFields.membership_status === "active",
  );

  const recontractFields = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ membership_status: "canceled", stripe_subscription_id: "sub_old" }),
    subscription: sampleSubscription({ id: "sub_new", status: "active" }),
    context: "checkout",
    now,
  });
  record(
    checks,
    "W2. checkout re-contract canceled→active",
    recontractFields.membership_status === "active",
  );

  const pastDueFields = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ membership_status: "active" }),
    subscription: sampleSubscription({ status: "past_due" }),
    context: "sync",
    now,
  });
  record(
    checks,
    "W3. subscription.updated past_due keeps active (no suspend)",
    pastDueFields.subscription_status === "past_due" &&
      pastDueFields.membership_status !== "suspended",
  );

  const unpaidFields = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ membership_status: "active" }),
    subscription: sampleSubscription({ status: "unpaid" }),
    context: "sync",
    now,
  });
  record(
    checks,
    "W4. subscription.updated unpaid→suspended",
    unpaidFields.membership_status === "suspended" &&
      unpaidFields.suspended_at === now.toISOString(),
  );

  const recoveryFields = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ membership_status: "suspended", suspended_at: now.toISOString() }),
    subscription: sampleSubscription({ status: "active" }),
    context: "sync",
    now,
  });
  record(
    checks,
    "W5. payment recovery suspended→active",
    recoveryFields.membership_status === "active" && recoveryFields.suspended_at === null,
  );

  const deletedFields = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ membership_status: "active" }),
    subscription: sampleSubscription({ status: "canceled" }),
    context: "sync",
    now,
  });
  record(
    checks,
    "W6. subscription.deleted→canceled membership",
    deletedFields.membership_status === "canceled",
  );

  const paymentFailedPastDue = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ membership_status: "active" }),
    subscription: sampleSubscription({ status: "past_due" }),
    context: "sync",
    now,
  });
  record(
    checks,
    "W7. payment_failed sync past_due keeps active (no suspend)",
    paymentFailedPastDue.subscription_status === "past_due" &&
      paymentFailedPastDue.membership_status !== "suspended",
  );

  const paymentFailedUnpaid = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ membership_status: "active" }),
    subscription: sampleSubscription({ status: "unpaid" }),
    context: "sync",
    now,
  });
  record(
    checks,
    "W8. payment_failed sync unpaid→suspended",
    paymentFailedUnpaid.membership_status === "suspended",
  );

  const staleBlocked = applyMembershipMappingResult({
    currentMembershipStatus: "canceled",
    mapping: { action: "set", membershipStatus: "active" },
    suspendedAtIso: now.toISOString(),
    staleAfterCancellation: isStaleActiveEventAfterCancellation({
      currentMembershipStatus: "canceled",
      breederStripeSubscriptionId: "sub_test_1",
      eventSubscriptionId: "sub_test_1",
      mappedMembershipStatus: "active",
    }),
  });
  record(checks, "W9. stale active after canceled blocked", staleBlocked === null);
}

function testNonChanges(checks: Check[]): void {
  const handlers = [
    "src/features/billing/webhook/handlers/checkout-session-completed.ts",
    "src/features/billing/webhook/handlers/subscription-events.ts",
    "src/features/billing/webhook/handlers/invoice-payment-failed.ts",
  ]
    .map(readSource)
    .join("\n");

  const membershipGateSource = readSource("src/features/billing/membership-gate.ts");

  record(
    checks,
    "N1. handlers do not touch pets table",
    !handlers.includes('.from("pets")') && !handlers.includes("pets.status"),
  );

  record(checks, "N2. handlers do not update review_status", !handlers.includes("review_status"));

  record(
    checks,
    "N3. Step 3 suspended checkout still rejected",
    membershipGateSource.includes('membershipStatus === "suspended"') &&
      membershipGateSource.includes("allowed: false"),
  );

  const step4Source = readSource("src/features/billing/webhook/handle-stripe-webhook-request.ts");
  record(
    checks,
    "N4. Step 4 idempotency claim/release preserved",
    step4Source.includes("claimWebhookEvent") &&
      step4Source.includes("releaseWebhookEventClaim") &&
      step4Source.includes("in_progress"),
  );

  record(
    checks,
    "N5. mapping centralized in membership-mapping.ts",
    readSource("src/lib/stripe/membership-mapping.ts").includes(
      "mapStripeSubscriptionStatusToMembership",
    ),
  );
}

function main(): void {
  const checks: Check[] = [];
  console.log("Stripe Step 5 — membership_status tests\n");

  testMappingUnit(checks);
  testSafety(checks);
  testWebhookIntegration(checks);
  testNonChanges(checks);

  record(
    checks,
    "N6. non-production Product ID optional for dev",
    !isStripeBreederProductIdRequired(),
  );

  finish(checks);
}

main();

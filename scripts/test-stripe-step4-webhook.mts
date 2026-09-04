/**
 * Stripe Step 4 — Webhook signature, idempotency, and handler static/unit verification.
 *
 * Does not require a running Next.js server or Stripe CLI.
 * Optional DB idempotency integration when SUPABASE_SERVICE_ROLE_KEY is set.
 *
 * Usage:
 *   npm run test:stripe-step4-webhook
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import nextEnv from "@next/env";
import Stripe from "stripe";

import { HANDLED_STRIPE_WEBHOOK_EVENT_TYPES } from "@/features/billing/webhook/constants";
import { WebhookHandlerError } from "@/features/billing/webhook/errors";
import { handleStripeWebhookRequest } from "@/features/billing/webhook/handle-stripe-webhook-request";
import { assertBreederSubscriptionProduct } from "@/features/billing/webhook/product-validation";
import { processStripeWebhookEvent } from "@/features/billing/webhook/process-webhook-event";
import {
  assertCustomerIdMatches,
  assertSubscriptionIdReplaceAllowed,
} from "@/features/billing/webhook/resolve-breeder";
import {
  eventCreatedAtIso,
  extractSubscriptionSyncFields,
  resolveStripeId,
  resolveSubscriptionCancelAtPeriodEnd,
} from "@/features/billing/webhook/stripe-refs";
import { isWebhookEventFinalized } from "@/features/billing/webhook/repository";
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

const TEST_WEBHOOK_SECRET = "whsec_step4_unit_test_secret";

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

function buildTestEvent(overrides: Partial<Stripe.Event> = {}): Stripe.Event {
  return {
    id: "evt_step4_test",
    object: "event",
    api_version: "2024-06-20",
    created: 1_700_000_000,
    data: { object: {} },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: "ping",
    ...overrides,
  } as Stripe.Event;
}

function buildSignedPayload(
  event: Stripe.Event,
  secret: string,
): { body: string; signature: string } {
  const body = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
  });
  return { body, signature };
}

function sampleBreeder(overrides: Partial<BreederWebhookRow> = {}): BreederWebhookRow {
  return {
    id: "breeder-uuid-1",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    membership_status: "pending",
    subscription_status: null,
    subscription_current_period_end: null,
    cancel_at_period_end: false,
    last_payment_failed_at: null,
    ...overrides,
  };
}

function sampleSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_test_1",
    object: "subscription",
    customer: "cus_test_1",
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

function testCancelAtPeriodEndSync(checks: Check[]): void {
  const periodEnd = 1_700_100_000;

  const caseA = extractSubscriptionSyncFields(
    sampleSubscription({ cancel_at_period_end: true, cancel_at: null }),
  );
  record(
    checks,
    "27b. CASE A: cancel_at_period_end=true → sync true",
    caseA.cancel_at_period_end === true,
  );

  const caseB = extractSubscriptionSyncFields(
    sampleSubscription({
      cancel_at_period_end: false,
      cancel_at: periodEnd,
      items: {
        object: "list",
        data: [
          {
            id: "si_test",
            object: "subscription_item",
            current_period_end: periodEnd,
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
    }),
  );
  record(
    checks,
    "27c. CASE B: cancel_at === current_period_end → sync true",
    caseB.cancel_at_period_end === true,
  );

  const caseC = extractSubscriptionSyncFields(
    sampleSubscription({ cancel_at_period_end: false, cancel_at: null }),
  );
  record(checks, "27d. CASE C: cancel_at null → sync false", caseC.cancel_at_period_end === false);

  const caseD = extractSubscriptionSyncFields(
    sampleSubscription({
      cancel_at_period_end: false,
      cancel_at: periodEnd + 86_400,
    }),
  );
  record(
    checks,
    "27e. CASE D: cancel_at != current_period_end → sync false",
    caseD.cancel_at_period_end === false,
  );

  const caseE = extractSubscriptionSyncFields(
    sampleSubscription({
      status: "canceled",
      cancel_at_period_end: false,
      cancel_at: periodEnd,
    }),
  );
  record(
    checks,
    "27f. CASE E: canceled status + cancel_at → sync false",
    caseE.cancel_at_period_end === false,
  );

  record(
    checks,
    "27g. resolveSubscriptionCancelAtPeriodEnd exported for mapping",
    typeof resolveSubscriptionCancelAtPeriodEnd === "function",
  );
}

async function testSignatureAndRouting(checks: Check[]): Promise<void> {
  const routeSource = readSource("src/app/api/webhooks/stripe/route.ts");
  const handlerSource = readSource("src/features/billing/webhook/handle-stripe-webhook-request.ts");
  const repoSource = readSource("src/features/billing/webhook/repository.ts");

  record(
    checks,
    "1. POST route at /api/webhooks/stripe",
    routeSource.includes("handleStripeWebhookRequest"),
  );
  record(checks, "2. raw body via request.text()", routeSource.includes("request.text()"));
  record(checks, "3. no GET handler", !routeSource.includes("export async function GET"));
  record(
    checks,
    "4. constructEvent for signature verification",
    handlerSource.includes("Stripe.webhooks.constructEvent"),
  );
  record(
    checks,
    "5. missing Stripe-Signature → 400",
    handlerSource.includes("STRIPE_WEBHOOK_MISSING_SIGNATURE_MESSAGE") &&
      handlerSource.includes("httpStatus: 400"),
  );
  record(
    checks,
    "6. invalid signature → 400",
    handlerSource.includes("STRIPE_WEBHOOK_INVALID_SIGNATURE_MESSAGE"),
  );
  record(
    checks,
    "7. webhook secret config error → 500 (no secret in response)",
    handlerSource.includes("STRIPE_WEBHOOK_CONFIG_ERROR_MESSAGE") &&
      handlerSource.includes("httpStatus: 500") &&
      !handlerSource.includes("error: webhookSecret") &&
      !handlerSource.includes("JSON.stringify({ secret"),
  );
  record(
    checks,
    "8. processing failure rethrows for route 500",
    handlerSource.includes("throw error"),
  );
  record(checks, "9. route returns 500 on thrown error", routeSource.includes("status: 500"));
  record(checks, "10. success returns received:true", routeSource.includes("{ received: true }"));

  record(
    checks,
    "11. claim via INSERT (atomic idempotency)",
    repoSource.includes('.from("stripe_webhook_events").insert'),
  );
  record(
    checks,
    "12. duplicate finalized event → 200",
    repoSource.includes("isWebhookEventFinalized") && handlerSource.includes("duplicate: true"),
  );
  record(
    checks,
    "12b. in-progress concurrent event → 503",
    repoSource.includes('"in_progress"') &&
      handlerSource.includes("STRIPE_WEBHOOK_IN_PROGRESS_MESSAGE") &&
      handlerSource.includes("httpStatus: 503"),
  );
  record(
    checks,
    "13. release claim on handler failure",
    repoSource.includes("releaseWebhookEventClaim") &&
      handlerSource.includes("releaseWebhookEventClaim"),
  );
  record(
    checks,
    "14. finalize processed_at on success only",
    repoSource.includes("finalizeWebhookEvent") && handlerSource.includes("finalizeWebhookEvent"),
  );
  record(
    checks,
    "15. no payload column in insert",
    !repoSource.includes("payload") && !repoSource.includes("raw_body"),
  );
  record(
    checks,
    "16. service_role via createAdminClient",
    repoSource.includes("createAdminClient"),
  );

  const event = buildTestEvent({ type: "customer.created" });
  const { body, signature } = buildSignedPayload(event, TEST_WEBHOOK_SECRET);

  let constructOk = false;
  try {
    Stripe.webhooks.constructEvent(body, signature, TEST_WEBHOOK_SECRET);
    constructOk = true;
  } catch {
    constructOk = false;
  }
  record(checks, "17. generateTestHeaderString + constructEvent", constructOk);

  let invalidSigRejected = false;
  try {
    Stripe.webhooks.constructEvent(body, signature, "whsec_wrong_secret");
  } catch {
    invalidSigRejected = true;
  }
  record(checks, "18. wrong secret rejects signature", invalidSigRejected);

  await processStripeWebhookEvent(buildTestEvent({ type: "customer.created" }));
  record(checks, "19. unhandled event type is no-op", true);

  record(
    checks,
    "20. four handled event types registered",
    HANDLED_STRIPE_WEBHOOK_EVENT_TYPES.length === 4 &&
      HANDLED_STRIPE_WEBHOOK_EVENT_TYPES.includes("checkout.session.completed") &&
      HANDLED_STRIPE_WEBHOOK_EVENT_TYPES.includes("customer.subscription.updated") &&
      HANDLED_STRIPE_WEBHOOK_EVENT_TYPES.includes("customer.subscription.deleted") &&
      HANDLED_STRIPE_WEBHOOK_EVENT_TYPES.includes("invoice.payment_failed"),
  );

  const missingSig = await handleStripeWebhookRequest("{}", null);
  record(
    checks,
    "20b. handleStripeWebhookRequest missing signature → 400",
    !missingSig.success && missingSig.httpStatus === 400,
  );

  process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  const badSig = await handleStripeWebhookRequest("{}", "t=0,v1=invalid");
  record(
    checks,
    "20c. handleStripeWebhookRequest invalid signature → 400",
    !badSig.success && badSig.httpStatus === 400,
  );
}

function testBreederSafetyAndSync(checks: Check[]): void {
  const checkoutSource = readSource(
    "src/features/billing/webhook/handlers/checkout-session-completed.ts",
  );
  const subscriptionSource = readSource(
    "src/features/billing/webhook/handlers/subscription-events.ts",
  );
  const invoiceSource = readSource(
    "src/features/billing/webhook/handlers/invoice-payment-failed.ts",
  );

  let customerMismatch = false;
  try {
    assertCustomerIdMatches(sampleBreeder({ stripe_customer_id: "cus_existing" }), "cus_other");
  } catch (error) {
    customerMismatch = error instanceof WebhookHandlerError && error.code === "customer_mismatch";
  }
  record(checks, "21. customer ID mismatch rejected", customerMismatch);

  let subscriptionMismatch = false;
  try {
    assertSubscriptionIdReplaceAllowed(
      sampleBreeder({
        stripe_subscription_id: "sub_old",
        membership_status: "active",
        subscription_status: "active",
      }),
      "sub_new",
    );
  } catch (error) {
    subscriptionMismatch =
      error instanceof WebhookHandlerError && error.code === "subscription_mismatch";
  }
  record(checks, "22. subscription overwrite blocked when active", subscriptionMismatch);

  let recontractAllowed = true;
  try {
    assertSubscriptionIdReplaceAllowed(
      sampleBreeder({
        stripe_subscription_id: "sub_old",
        membership_status: "canceled",
        subscription_status: "canceled",
      }),
      "sub_new",
    );
  } catch {
    recontractAllowed = false;
  }
  record(checks, "23. re-contract allowed when canceled", recontractAllowed);

  const fields = extractSubscriptionSyncFields(sampleSubscription());
  record(
    checks,
    "24. sync extracts stripe_customer_id",
    fields.stripe_customer_id === "cus_test_1",
  );
  record(
    checks,
    "25. sync extracts stripe_subscription_id",
    fields.stripe_subscription_id === "sub_test_1",
  );
  record(checks, "26. sync extracts stripe_price_id", fields.stripe_price_id === "price_test");
  record(checks, "27. sync extracts subscription_status", fields.subscription_status === "active");
  record(
    checks,
    "28. resolveStripeId handles expanded customer",
    resolveStripeId({ id: "cus_x" } as Stripe.Customer) === "cus_x",
  );

  testCancelAtPeriodEndSync(checks);

  const createdIso = eventCreatedAtIso(buildTestEvent({ created: 1_700_000_000 }));
  record(
    checks,
    "29. event.created → ISO for payment_failed",
    createdIso === "2023-11-14T22:13:20.000Z",
  );

  delete process.env.STRIPE_BREEDER_PRODUCT_ID;
  let skippedWhenUnset = true;
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
  } catch {
    skippedWhenUnset = false;
  }
  record(
    checks,
    "30. product validation skipped when env unset (non-production)",
    skippedWhenUnset && !isStripeBreederProductIdRequired(),
  );

  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  delete process.env.STRIPE_BREEDER_PRODUCT_ID;
  let productionRequiresProduct = false;
  try {
    resolveStripeBreederProductIdForValidation();
  } catch {
    productionRequiresProduct = true;
  }
  let productionWebhookFailsClosed = false;
  try {
    assertBreederSubscriptionProduct(sampleSubscription());
  } catch (error) {
    productionWebhookFailsClosed =
      error instanceof WebhookHandlerError && error.code === "product_validation_config";
  }
  process.env.NODE_ENV = previousNodeEnv;
  record(checks, "30b. production requires STRIPE_BREEDER_PRODUCT_ID", productionRequiresProduct);
  record(
    checks,
    "30c. production webhook fails closed without Product ID",
    productionWebhookFailsClosed,
  );

  process.env.STRIPE_BREEDER_PRODUCT_ID = "prod_withtama_breeder";
  let productMatchOk = true;
  try {
    assertBreederSubscriptionProduct(sampleSubscription());
  } catch {
    productMatchOk = false;
  }
  record(checks, "31. product validation passes when product matches", productMatchOk);

  let productMismatch = false;
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
      }),
    );
  } catch (error) {
    productMismatch =
      error instanceof WebhookHandlerError && error.code === "product_validation_failed";
  }
  record(checks, "32. product validation fails on mismatch when env set", productMismatch);
  delete process.env.STRIPE_BREEDER_PRODUCT_ID;

  record(
    checks,
    "33. checkout uses metadata.breeder_id",
    checkoutSource.includes("metadata?.breeder_id") &&
      checkoutSource.includes('session.mode !== "subscription"'),
  );
  record(
    checks,
    "34. checkout retrieves subscription when string ID",
    checkoutSource.includes("subscriptions.retrieve"),
  );
  record(
    checks,
    "35. subscription.updated uses resolveBreederForSubscription",
    subscriptionSource.includes("resolveBreederForSubscription"),
  );
  record(
    checks,
    "36. invoice.payment_failed uses parent.subscription_details",
    invoiceSource.includes("resolveInvoiceSubscriptionId"),
  );
  record(
    checks,
    "36b. invoice.payment_failed updates last_payment_failed_at only",
    invoiceSource.includes("last_payment_failed_at") && invoiceSource.includes("eventCreatedAtIso"),
  );

  const typesSource = readSource("src/features/billing/webhook/types.ts");
  const applySource = readSource(
    "src/features/billing/webhook/apply-subscription-webhook-update.ts",
  );
  const updateCalls = [checkoutSource, subscriptionSource, invoiceSource, applySource].join("\n");
  record(
    checks,
    "37. membership_status updated via centralized mapping (Step 5)",
    updateCalls.includes("buildBreederUpdateFromSubscription") &&
      typesSource.includes('"membership_status"'),
  );
  record(
    checks,
    "37b. isWebhookEventFinalized distinguishes claim vs finalize",
    !isWebhookEventFinalized({
      created_at: "2026-01-01T00:00:00.000Z",
      processed_at: "2026-01-01T00:00:00.000Z",
    }) &&
      isWebhookEventFinalized({
        created_at: "2026-01-01T00:00:00.000Z",
        processed_at: "2026-01-01T00:00:01.000Z",
      }),
  );

  record(
    checks,
    "38. no webhook secret in route response body",
    !readSource("src/app/api/webhooks/stripe/route.ts").includes("whsec_") &&
      !readSource("src/app/api/webhooks/stripe/route.ts").includes("STRIPE_WEBHOOK_SECRET"),
  );
  record(
    checks,
    "39. dev log limited to eventId/eventType",
    readSource("src/features/billing/webhook/handle-stripe-webhook-request.ts").includes(
      "eventId: event.id",
    ) &&
      !readSource("src/features/billing/webhook/handle-stripe-webhook-request.ts").includes(
        "console.log",
      ),
  );
}

async function testOptionalDbIdempotency(checks: Check[]): Promise<void> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!serviceRoleKey || !supabaseUrl) {
    skip(
      checks,
      "40. DB idempotency claim duplicate (integration)",
      "SUPABASE_SERVICE_ROLE_KEY or URL unset",
    );
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stripeEventId = `evt_step4_test_${Date.now()}`;

  const first = await admin.from("stripe_webhook_events").insert({
    stripe_event_id: stripeEventId,
    event_type: "ping",
  });

  record(checks, "40. DB INSERT claim succeeds", first.error === null);

  const second = await admin.from("stripe_webhook_events").insert({
    stripe_event_id: stripeEventId,
    event_type: "ping",
  });
  record(checks, "41. DB duplicate INSERT → 23505", second.error?.code === "23505");

  await admin.from("stripe_webhook_events").delete().eq("stripe_event_id", stripeEventId);
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  console.log("Stripe Step 4 — Webhook + idempotency tests\n");

  await testSignatureAndRouting(checks);
  testBreederSafetyAndSync(checks);
  await testOptionalDbIdempotency(checks);

  finish(checks);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

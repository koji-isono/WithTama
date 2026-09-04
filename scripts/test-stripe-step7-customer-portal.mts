/**
 * Stripe Step 7 — Customer Portal static verification.
 *
 * Usage:
 *   npm run test:stripe-step7-customer-portal
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BILLING_PORTAL_API_PATH,
  PORTAL_ALLOWED_MEMBERSHIP_STATUSES,
} from "@/features/billing/portal-constants";
import { evaluatePortalMembershipGate } from "@/features/billing/portal-gate";
import { validatePortalClientInput } from "@/features/billing/portal-request";
import {
  BREEDER_BILLING_PATH,
  resolveBillingStatusPresentation,
} from "@/features/billing/billing-display";
import { evaluateCheckoutMembershipGate } from "@/features/billing/membership-gate";

type Check = { name: string; passed: boolean; detail?: string };

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
}

function finish(checks: Check[]): void {
  const passed = checks.filter((c) => c.passed).length;
  console.log(`\n${passed} passed / ${checks.length - passed} failed`);
  if (passed !== checks.length) process.exitCode = 1;
}

function main(): void {
  const checks: Check[] = [];

  const route = read("src/app/api/billing/portal/route.ts");
  const handler = read("src/features/billing/portal-handler.ts");
  const createPortal = read("src/features/billing/create-portal-session.ts");
  const portalUrls = read("src/features/billing/portal-urls.ts");
  const portalBtn = read("src/features/billing/components/billing-portal-button.tsx");
  const view = read("src/features/billing/components/breeder-billing-view.tsx");
  const webhookMapping = read("src/lib/stripe/membership-mapping.ts");

  record(
    checks,
    "1. Portal API route at /api/billing/portal",
    route.includes("handleBreederPortalRequest"),
  );
  record(checks, "2. POST only (no GET export)", !route.includes("export async function GET"));
  record(
    checks,
    "3. success returns url only",
    route.includes("NextResponse.json({ url: result.url })"),
  );
  record(
    checks,
    "4. unauthenticated returns 401 message",
    handler.includes("401") && handler.includes("BILLING_PORTAL_UNAUTHORIZED_MESSAGE"),
  );
  record(
    checks,
    "5. buyer/admin forbidden",
    handler.includes("isAdminUser") &&
      handler.includes('role !== "breeder"') &&
      handler.includes("403"),
  );
  record(
    checks,
    "6. breeder row missing returns 404",
    handler.includes("404") && handler.includes("BILLING_PORTAL_BREEDER_NOT_FOUND_MESSAGE"),
  );
  record(
    checks,
    "7. stripe_customer_id null returns 400",
    handler.includes("BILLING_PORTAL_NO_CUSTOMER_MESSAGE") &&
      handler.includes("!breeder.stripe_customer_id"),
  );
  record(
    checks,
    "8. active membership Portal allowed",
    evaluatePortalMembershipGate("active").allowed === true,
  );
  record(
    checks,
    "9. suspended membership Portal allowed",
    evaluatePortalMembershipGate("suspended").allowed === true,
  );
  record(
    checks,
    "10. pending membership Portal blocked",
    evaluatePortalMembershipGate("pending").allowed === false,
  );
  record(
    checks,
    "11. canceled membership Portal blocked",
    evaluatePortalMembershipGate("canceled").allowed === false,
  );

  const pendingUi = resolveBillingStatusPresentation({
    membershipStatus: "pending",
    subscriptionStatus: null,
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(checks, "12. pending UI has no Portal CTA", pendingUi.showPortalCta === false);

  const canceledUi = resolveBillingStatusPresentation({
    membershipStatus: "canceled",
    subscriptionStatus: "canceled",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(checks, "13. canceled UI has no Portal CTA", canceledUi.showPortalCta === false);

  const activeUi = resolveBillingStatusPresentation({
    membershipStatus: "active",
    subscriptionStatus: "active",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(checks, "14. active UI has Portal CTA", activeUi.showPortalCta === true);

  const suspendedUi = resolveBillingStatusPresentation({
    membershipStatus: "suspended",
    subscriptionStatus: "unpaid",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(checks, "15. suspended UI has Portal CTA", suspendedUi.showPortalCta === true);

  const cancelScheduledUi = resolveBillingStatusPresentation({
    membershipStatus: "active",
    subscriptionStatus: "active",
    cancelAtPeriodEnd: true,
    reviewApproved: true,
  });
  record(
    checks,
    "16. cancel_at_period_end active UI keeps standard portal label",
    cancelScheduledUi.showPortalCta === true &&
      cancelScheduledUi.portalCtaLabel === "支払い方法を確認・変更",
  );

  record(
    checks,
    "17. customer ID from DB row in handler",
    handler.includes("getBreederBillingRowByUserId") &&
      handler.includes("breeder.stripe_customer_id") &&
      createPortal.includes("stripeCustomerId"),
  );
  record(
    checks,
    "18. client customer rejected",
    !validatePortalClientInput({ customer: "cus_fake" }).valid,
  );
  record(
    checks,
    "19. client stripe_customer_id rejected",
    !validatePortalClientInput({ stripe_customer_id: "cus_fake" }).valid,
  );
  record(
    checks,
    "20. client breeder_id rejected",
    !validatePortalClientInput({ breeder_id: "uuid" }).valid,
  );
  record(
    checks,
    "21. client return_url rejected",
    !validatePortalClientInput({ return_url: "https://evil.example" }).valid,
  );
  record(
    checks,
    "22. return_url server-managed to BR-13",
    (portalUrls.includes(BREEDER_BILLING_PATH) ||
      portalUrls.includes("buildBreederPortalReturnUrl")) &&
      createPortal.includes("buildBreederPortalReturnUrl"),
  );
  record(
    checks,
    "23. billingPortal.sessions.create used",
    createPortal.includes("billingPortal.sessions.create"),
  );
  record(
    checks,
    "24. Stripe Secret not in portal button",
    !portalBtn.includes("STRIPE_SECRET") &&
      !portalBtn.includes("sk_test") &&
      !portalBtn.includes("sk_live"),
  );
  record(
    checks,
    "25. Portal CTA double-submit prevention",
    portalBtn.includes("disabled={loading}") && portalBtn.includes("if (loading)"),
  );
  record(
    checks,
    "26. handler does not update membership_status",
    !handler.includes(".update(") && !handler.includes("membership_status ="),
  );
  record(
    checks,
    "27. webhook mapping unchanged (no portal edits)",
    webhookMapping.includes("mapStripeSubscriptionStatusToMembership") &&
      !webhookMapping.includes("portal"),
  );
  record(
    checks,
    "28. Checkout gate unchanged",
    evaluateCheckoutMembershipGate("active").allowed === false &&
      evaluateCheckoutMembershipGate("pending").allowed === true,
  );
  record(
    checks,
    "29. view renders BillingPortalButton",
    view.includes("BillingPortalButton") && view.includes("showPortalCta"),
  );
  record(
    checks,
    "30. Portal API path constant",
    portalBtn.includes("BILLING_PORTAL_API_PATH") &&
      BILLING_PORTAL_API_PATH === "/api/billing/portal",
  );
  record(
    checks,
    "31. PORTAL_ALLOWED matches gate",
    PORTAL_ALLOWED_MEMBERSHIP_STATUSES.join(",") === "active,suspended",
  );
  record(
    checks,
    "32. generic error on Stripe failure (no raw error to client)",
    handler.includes("BILLING_PORTAL_GENERIC_ERROR_MESSAGE") && !handler.includes("error.message"),
  );
  record(
    checks,
    "33. no WithTama cancel API in portal handler",
    !handler.includes("subscriptions.cancel") && !handler.includes("cancelSubscription"),
  );
  record(
    checks,
    "34. review not approved returns 403",
    handler.includes('breeder.review_status !== "approved"') &&
      handler.includes("BILLING_PORTAL_REVIEW_NOT_APPROVED_MESSAGE"),
  );
  record(
    checks,
    "35. empty body allowed",
    validatePortalClientInput(null).valid && validatePortalClientInput({}).valid,
  );
  record(
    checks,
    "36. return_url uses getAppBaseUrl (no Host header)",
    portalUrls.includes("getAppBaseUrl") &&
      !portalUrls.includes("headers") &&
      !portalUrls.includes("request.headers"),
  );
  record(
    checks,
    "37. portal handler does not update subscription_status",
    !handler.includes("subscription_status") || !handler.includes(".update("),
  );
  record(
    checks,
    "38. portal handler does not update cancel_at_period_end",
    !handler.includes("cancel_at_period_end"),
  );

  finish(checks);
}

main();

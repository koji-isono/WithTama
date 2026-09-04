/**
 * Stripe Step 6 — BR-13 billing UI static verification.
 *
 * Usage:
 *   npm run test:stripe-step6-billing-ui
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BILLING_ACTIVE_CANCEL_SCHEDULED_HEADLINE,
  BILLING_PORTAL_ACTIVE_LABEL,
  BREEDER_BILLING_PATH,
  BILLING_CHECKOUT_SUCCESS_MESSAGE,
  buildCancelScheduledDescription,
  resolveBillingStatusPresentation,
  resolveBillingUiVariant,
  shouldShowCheckoutCta,
} from "@/features/billing/billing-display";
import { buildBreederUpdateFromSubscription } from "@/features/billing/webhook/apply-subscription-webhook-update";
import type { BreederWebhookRow } from "@/features/billing/webhook/types";
import type Stripe from "stripe";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function finish(checks: Check[]): void {
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.length - passed;
  console.log("");
  console.log(`${passed} passed / ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

function main(): void {
  const checks: Check[] = [];

  const page = read("src/app/breeder/billing/page.tsx");
  const view = read("src/features/billing/components/breeder-billing-view.tsx");
  const checkoutBtn = read("src/features/billing/components/billing-checkout-button.tsx");
  const loaders = read("src/features/billing/loaders.ts");
  const repository = read("src/features/billing/repository.ts");
  const nav = read("src/components/layout/breeder-nav-items.ts");
  const breederAuth = read("src/features/auth/breeder-auth.ts");
  const dashboardPage = read("src/app/breeder/dashboard/page.tsx");
  const dashboardView = read(
    "src/features/breeder-dashboard/components/breeder-dashboard-view.tsx",
  );
  const dashboardLoaders = read("src/features/breeder-dashboard/loaders.ts");

  record(
    checks,
    "1. BR-13 route at /breeder/billing",
    page.includes("loadBreederBillingPageData") && page.includes("BreederBillingView"),
  );

  record(
    checks,
    "2. breeder-only via requireBreeder in loader",
    loaders.includes("requireBreeder") && loaders.includes("await requireBreeder()"),
  );

  record(
    checks,
    "3. buyer/admin redirected away from breeder routes",
    breederAuth.includes('redirect("/buyer")') &&
      breederAuth.includes('redirect("/admin")') &&
      breederAuth.includes('redirect("/login")'),
  );

  const pending = resolveBillingStatusPresentation({
    membershipStatus: "pending",
    subscriptionStatus: null,
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(
    checks,
    "4. pending shows payment-required headline",
    pending.headline.includes("お支払い手続きが必要") && pending.variant === "pending",
  );
  record(checks, "5. pending CTA shown when approved", pending.showCheckoutCta === true);

  const active = resolveBillingStatusPresentation({
    membershipStatus: "active",
    subscriptionStatus: "active",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(checks, "6. active shows 利用中", active.headline === "利用中");
  record(checks, "7. active has no Checkout CTA", active.showCheckoutCta === false);

  const pastDue = resolveBillingStatusPresentation({
    membershipStatus: "active",
    subscriptionStatus: "past_due",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(
    checks,
    "8. past_due + active membership does not show 利用停止",
    !pastDue.headline.includes("利用停止") &&
      !pastDue.description.includes("利用停止") &&
      pastDue.headline === "利用中",
  );
  record(
    checks,
    "9. past_due auxiliary message present",
    pastDue.auxiliaryMessage?.includes("引き続きご利用") === true,
  );

  const periodEndSample = "2026年10月2日";

  const cancelScheduled = resolveBillingStatusPresentation({
    membershipStatus: "active",
    subscriptionStatus: "active",
    cancelAtPeriodEnd: true,
    reviewApproved: true,
    periodEndLabel: periodEndSample,
  });
  record(
    checks,
    "10. cancel_at_period_end shows 解約予定 (not canceled)",
    cancelScheduled.headline === BILLING_ACTIVE_CANCEL_SCHEDULED_HEADLINE &&
      cancelScheduled.variant === "active_cancel_scheduled",
  );
  record(
    checks,
    "11. cancel scheduled shows end date and cancel copy (not next renewal)",
    cancelScheduled.showNextRenewalDate === false &&
      cancelScheduled.showEndScheduledDate === true &&
      cancelScheduled.description.includes(`${periodEndSample}に利用終了予定です`) &&
      cancelScheduled.description.includes("解約予定日までは引き続きご利用いただけます"),
  );

  const suspended = resolveBillingStatusPresentation({
    membershipStatus: "suspended",
    subscriptionStatus: "unpaid",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(
    checks,
    "12. suspended shows payment verification headline",
    suspended.headline.includes("お支払いの確認が必要"),
  );
  record(checks, "13. suspended has no Checkout CTA", suspended.showCheckoutCta === false);
  record(
    checks,
    "14. suspended shows Portal CTA (not prep notice)",
    suspended.showPortalCta === true &&
      suspended.portalCtaLabel?.includes("お支払い方法") === true &&
      suspended.auxiliaryMessage === null,
  );

  const canceled = resolveBillingStatusPresentation({
    membershipStatus: "canceled",
    subscriptionStatus: "canceled",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
  });
  record(checks, "15. canceled shows 解約済み", canceled.headline === "解約済み");
  record(
    checks,
    "16. canceled re-subscribe CTA",
    canceled.showCheckoutCta === true && canceled.checkoutCtaLabel?.includes("もう一度") === true,
  );

  record(
    checks,
    "17. Checkout uses existing POST /api/billing/checkout",
    checkoutBtn.includes("BILLING_CHECKOUT_API_PATH") && checkoutBtn.includes('method: "POST"'),
  );

  record(
    checks,
    "18. CTA double-submit prevention",
    checkoutBtn.includes("disabled={loading}") &&
      checkoutBtn.includes("if (loading)") &&
      (checkoutBtn.includes("お支払い画面を開いています") ||
        checkoutBtn.includes("BILLING_CHECKOUT_LOADING_LABEL")),
  );

  record(
    checks,
    "19. Checkout does not send amount",
    !checkoutBtn.includes("amount") && !checkoutBtn.match(/5000/),
  );
  record(
    checks,
    "20. Checkout does not send price_id",
    !checkoutBtn.includes("price_id") && !checkoutBtn.includes("priceId"),
  );
  record(
    checks,
    "21. Checkout does not send tax_rate_id",
    !checkoutBtn.includes("tax_rate_id") && !checkoutBtn.includes("taxRateId"),
  );

  record(
    checks,
    "22. internal Stripe IDs not in view",
    !view.includes("stripe_customer_id") &&
      !view.includes("stripe_subscription_id") &&
      !view.includes("stripe_price_id"),
  );

  const displaySelectBlock =
    repository.match(/breederBillingDisplaySelect[\s\S]*?review_status"/)?.[0] ?? "";
  record(
    checks,
    "23. display select excludes internal Stripe IDs",
    !displaySelectBlock.includes("stripe_customer_id") &&
      !displaySelectBlock.includes("stripe_subscription_id") &&
      !displaySelectBlock.includes("stripe_price_id"),
  );

  record(
    checks,
    "24. checkout=success does not assert active membership",
    dashboardView.includes("CheckoutResultBanner") &&
      view.includes("利用状態を確認") &&
      !view.includes("利用中です") &&
      !view.includes("月額会員になりました"),
  );

  record(
    checks,
    "25. dashboard success links to billing page",
    view.includes('href="/breeder/billing"') || view.includes("月額会費を確認"),
  );

  record(
    checks,
    "26. checkout return parsed in dashboard loader",
    dashboardLoaders.includes("parseCheckoutReturnQuery") &&
      dashboardPage.includes("checkoutQuery"),
  );

  record(
    checks,
    "27. nav includes 月額会費",
    nav.includes("月額会費") && nav.includes(BREEDER_BILLING_PATH),
  );

  record(
    checks,
    "28. CTA only for pending/canceled",
    shouldShowCheckoutCta("pending") === true &&
      shouldShowCheckoutCta("canceled") === true &&
      shouldShowCheckoutCta("active") === false &&
      shouldShowCheckoutCta("suspended") === false,
  );

  record(
    checks,
    "29. billing view does not mutate pets",
    !view.includes("pets") && !loaders.includes("pets") && !page.includes("pets"),
  );

  record(
    checks,
    "30. billing view does not update membership_status",
    !view.includes("membership_status =") &&
      !checkoutBtn.includes("membership_status") &&
      !loaders.includes(".update("),
  );

  record(
    checks,
    "31. subscription_status not shown as primary label",
    !view.includes("subscription_status") && !view.includes("past_due"),
  );

  record(
    checks,
    "32. success message constant avoids active assertion",
    BILLING_CHECKOUT_SUCCESS_MESSAGE.includes("確認しています") &&
      !BILLING_CHECKOUT_SUCCESS_MESSAGE.includes("利用中"),
  );

  record(
    checks,
    "33. user-facing error uses generic message constant",
    checkoutBtn.includes("BILLING_CHECKOUT_GENERIC_ERROR_MESSAGE") &&
      !checkoutBtn.includes("error.message"),
  );

  const normalActive = resolveBillingStatusPresentation({
    membershipStatus: "active",
    subscriptionStatus: "active",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
    periodEndLabel: periodEndSample,
  });
  record(
    checks,
    "34. A: normal active shows 利用中 + next renewal + portal active label",
    normalActive.headline === "利用中" &&
      normalActive.showNextRenewalDate === true &&
      normalActive.showEndScheduledDate === false &&
      normalActive.portalCtaLabel === BILLING_PORTAL_ACTIVE_LABEL,
  );

  record(
    checks,
    "35. B: cancel scheduled shows end date label + same portal label as active",
    cancelScheduled.headline === BILLING_ACTIVE_CANCEL_SCHEDULED_HEADLINE &&
      cancelScheduled.showEndScheduledDate === true &&
      cancelScheduled.portalCtaLabel === BILLING_PORTAL_ACTIVE_LABEL &&
      buildCancelScheduledDescription(periodEndSample).includes(
        `${periodEndSample}に利用終了予定です`,
      ),
  );

  record(
    checks,
    "36. C: cancel_at_period_end keeps active variant (not canceled)",
    resolveBillingUiVariant({ membershipStatus: "active", cancelAtPeriodEnd: true }) ===
      "active_cancel_scheduled",
  );

  const afterUndo = resolveBillingStatusPresentation({
    membershipStatus: "active",
    subscriptionStatus: "active",
    cancelAtPeriodEnd: false,
    reviewApproved: true,
    periodEndLabel: periodEndSample,
  });
  record(
    checks,
    "37. D: cancel undo (cancel_at_period_end=false) reverts to normal active UI",
    afterUndo.variant === "active" &&
      afterUndo.headline === "利用中" &&
      afterUndo.showNextRenewalDate === true &&
      afterUndo.portalCtaLabel === BILLING_PORTAL_ACTIVE_LABEL,
  );

  const sampleBreeder = (overrides: Partial<BreederWebhookRow> = {}): BreederWebhookRow => ({
    id: "breeder-uuid-1",
    stripe_customer_id: "cus_test_1",
    stripe_subscription_id: "sub_test_1",
    stripe_price_id: "price_test",
    membership_status: "active",
    subscription_status: "active",
    subscription_current_period_end: "2026-10-02T00:00:00.000Z",
    cancel_at_period_end: false,
    last_payment_failed_at: null,
    suspended_at: null,
    ...overrides,
  });

  const sampleSubscription = (overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription =>
    ({
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
            current_period_end: 1_789_344_000,
            price: {
              id: "price_test",
              object: "price",
              product: "prod_withtama_breeder",
            },
          },
        ],
        has_more: false,
        url: "/v1/subscription_items",
      },
      metadata: { breeder_id: "breeder-uuid-1" },
      ...overrides,
    }) as Stripe.Subscription;

  const cancelScheduledSync = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder(),
    subscription: sampleSubscription({ cancel_at_period_end: true }),
    context: "sync",
  });
  record(
    checks,
    "38. E: cancel_at_period_end sync keeps membership active",
    cancelScheduledSync.cancel_at_period_end === true &&
      cancelScheduledSync.membership_status !== "canceled" &&
      cancelScheduledSync.membership_status !== "suspended",
  );

  const cancelUndoSync = buildBreederUpdateFromSubscription({
    breeder: sampleBreeder({ cancel_at_period_end: true }),
    subscription: sampleSubscription({ cancel_at_period_end: false }),
    context: "sync",
  });
  record(
    checks,
    "39. D/E: cancel undo sync sets cancel_at_period_end=false without canceling membership",
    cancelUndoSync.cancel_at_period_end === false &&
      (cancelUndoSync.membership_status === undefined ||
        cancelUndoSync.membership_status === "active"),
  );

  record(
    checks,
    "40. billing view shows 利用終了予定日 for cancel scheduled",
    view.includes("利用終了予定日") && view.includes("showEndScheduledDate"),
  );

  record(
    checks,
    "41. loader passes cancel_at_period_end to presentation",
    loaders.includes("cancel_at_period_end") && loaders.includes("periodEndLabel"),
  );

  record(
    checks,
    "42. cancel scheduled uses calm amber accent (distinct from active green)",
    view.includes("active_cancel_scheduled") && view.includes("text-amber-800"),
  );

  finish(checks);
}

main();

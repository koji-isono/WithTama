/**
 * BR-13 billing page display logic (pure functions for tests).
 * membership_status is primary; subscription_status is auxiliary only.
 */

export type MembershipStatus = "pending" | "active" | "suspended" | "canceled";

export type BillingUiVariant =
  "pending" | "active" | "active_cancel_scheduled" | "suspended" | "canceled";

export type BillingStatusPresentation = {
  variant: BillingUiVariant;
  headline: string;
  description: string;
  auxiliaryMessage: string | null;
  showCheckoutCta: boolean;
  checkoutCtaLabel: string | null;
  showNextRenewalDate: boolean;
  showEndScheduledDate: boolean;
};

export const BILLING_PLAN_NAME = "WithTama ブリーダー会員";
export const BILLING_PLAN_PRICE_LABEL = "月額 5,000円（税別）";
export const BREEDER_BILLING_PATH = "/breeder/billing";

export const BILLING_CHECKOUT_PENDING_LABEL = "月額会費のお支払いへ";
export const BILLING_CHECKOUT_RESUBSCRIBE_LABEL = "もう一度申し込む";
export const BILLING_CHECKOUT_LOADING_LABEL = "お支払い画面を開いています…";

export const BILLING_SUSPENDED_PORTAL_NOTICE = "お支払い方法の確認・変更機能は準備中です。";

export const BILLING_PAST_DUE_AUXILIARY_MESSAGE =
  "現在、お支払い状況を確認しています。サービスは引き続きご利用いただけます。";

export const BILLING_CHECKOUT_SUCCESS_MESSAGE =
  "お支払いを受け付けました。現在、利用状態を確認しています。";

export const BILLING_CHECKOUT_CANCEL_MESSAGE =
  "お支払い手続きは完了していません。必要であれば、もう一度お手続きください。";

export function isMembershipStatus(value: string): value is MembershipStatus {
  return value === "pending" || value === "active" || value === "suspended" || value === "canceled";
}

export function resolveBillingUiVariant(input: {
  membershipStatus: MembershipStatus;
  cancelAtPeriodEnd: boolean;
}): BillingUiVariant {
  if (input.membershipStatus === "pending") return "pending";
  if (input.membershipStatus === "suspended") return "suspended";
  if (input.membershipStatus === "canceled") return "canceled";
  if (input.membershipStatus === "active" && input.cancelAtPeriodEnd) {
    return "active_cancel_scheduled";
  }
  return "active";
}

export function shouldShowCheckoutCta(membershipStatus: MembershipStatus): boolean {
  return membershipStatus === "pending" || membershipStatus === "canceled";
}

export function resolveBillingStatusPresentation(input: {
  membershipStatus: MembershipStatus;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  reviewApproved: boolean;
}): BillingStatusPresentation {
  const variant = resolveBillingUiVariant({
    membershipStatus: input.membershipStatus,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
  });

  const showCheckoutCta = input.reviewApproved && shouldShowCheckoutCta(input.membershipStatus);

  switch (variant) {
    case "pending":
      return {
        variant,
        headline: "お支払い手続きが必要です",
        description:
          "WithTamaで犬猫情報を公開するには、ブリーダー会員の月額会費のお支払いが必要です。",
        auxiliaryMessage: input.reviewApproved
          ? null
          : "審査承認後に月額会費のお支払い手続きが可能になります。",
        showCheckoutCta,
        checkoutCtaLabel: showCheckoutCta ? BILLING_CHECKOUT_PENDING_LABEL : null,
        showNextRenewalDate: false,
        showEndScheduledDate: false,
      };
    case "active":
      return {
        variant,
        headline: "利用中",
        description: "月額会費のお支払いを確認できています。",
        auxiliaryMessage:
          input.subscriptionStatus === "past_due" ? BILLING_PAST_DUE_AUXILIARY_MESSAGE : null,
        showCheckoutCta: false,
        checkoutCtaLabel: null,
        showNextRenewalDate: true,
        showEndScheduledDate: false,
      };
    case "active_cancel_scheduled":
      return {
        variant,
        headline: "解約予定",
        description: "現在の契約期間終了までは WithTamaをご利用いただけます。",
        auxiliaryMessage: null,
        showCheckoutCta: false,
        checkoutCtaLabel: null,
        showNextRenewalDate: false,
        showEndScheduledDate: true,
      };
    case "suspended":
      return {
        variant,
        headline: "お支払いの確認が必要です",
        description: "月額会費のお支払いを確認できない状態です。",
        auxiliaryMessage: BILLING_SUSPENDED_PORTAL_NOTICE,
        showCheckoutCta: false,
        checkoutCtaLabel: null,
        showNextRenewalDate: false,
        showEndScheduledDate: false,
      };
    case "canceled":
      return {
        variant,
        headline: "解約済み",
        description: "現在、ブリーダー会員の月額契約は終了しています。",
        auxiliaryMessage: null,
        showCheckoutCta,
        checkoutCtaLabel: showCheckoutCta ? BILLING_CHECKOUT_RESUBSCRIBE_LABEL : null,
        showNextRenewalDate: false,
        showEndScheduledDate: false,
      };
  }
}

export function parseCheckoutReturnQuery(
  checkout: string | undefined,
): "success" | "cancel" | null {
  if (checkout === "success") return "success";
  if (checkout === "cancel") return "cancel";
  return null;
}

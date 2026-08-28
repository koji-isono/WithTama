import {
  BILLING_CHECKOUT_ALREADY_ACTIVE_MESSAGE,
  BILLING_CHECKOUT_INVALID_MEMBERSHIP_MESSAGE,
  BILLING_CHECKOUT_SUSPENDED_MESSAGE,
  CHECKOUT_ALLOWED_MEMBERSHIP_STATUSES,
  type CheckoutAllowedMembershipStatus,
} from "./constants";
import type { CheckoutMembershipGateResult } from "./types";

function isAllowedMembershipStatus(value: string): value is CheckoutAllowedMembershipStatus {
  return (CHECKOUT_ALLOWED_MEMBERSHIP_STATUSES as readonly string[]).includes(value);
}

/**
 * Step 3 Checkout 開始可否（membership_status のみ）。
 * suspended は Decision No.144 上再契約可能だが、既存 Subscription 状態未確認のため Step 3 では拒否（未決定）。
 */
export function evaluateCheckoutMembershipGate(
  membershipStatus: string,
): CheckoutMembershipGateResult {
  if (membershipStatus === "active") {
    return {
      allowed: false,
      httpStatus: 403,
      error: BILLING_CHECKOUT_ALREADY_ACTIVE_MESSAGE,
      reason: "active",
    };
  }

  if (membershipStatus === "suspended") {
    return {
      allowed: false,
      httpStatus: 403,
      error: BILLING_CHECKOUT_SUSPENDED_MESSAGE,
      reason: "suspended",
    };
  }

  if (isAllowedMembershipStatus(membershipStatus)) {
    return { allowed: true, membershipStatus };
  }

  return {
    allowed: false,
    httpStatus: 403,
    error: BILLING_CHECKOUT_INVALID_MEMBERSHIP_MESSAGE,
    reason: "other",
  };
}

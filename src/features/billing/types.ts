import type { CheckoutAllowedMembershipStatus } from "./constants";
import type { BillingStatusPresentation } from "./billing-display";

export type BreederBillingRow = {
  id: string;
  review_status: string;
  membership_status: string;
  stripe_customer_id: string | null;
};

/** Server-side billing display row — no internal Stripe IDs exposed to client. */
export type BreederBillingDisplayRow = {
  membership_status: string;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  cancel_at_period_end: boolean;
  review_status: string;
};

export type BreederBillingPageData = {
  presentation: BillingStatusPresentation;
  periodEndLabel: string | null;
  reviewApproved: boolean;
};

export type CheckoutMembershipGateResult =
  | { allowed: true; membershipStatus: CheckoutAllowedMembershipStatus }
  | { allowed: false; httpStatus: 403; error: string; reason: "active" | "suspended" | "other" };

export type CheckoutClientInputValidationResult =
  { valid: true } | { valid: false; httpStatus: 400; error: string };

export type CreateCheckoutSessionResult =
  { success: true; url: string } | { success: false; httpStatus: number; error: string };

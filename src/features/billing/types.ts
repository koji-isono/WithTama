import type { CheckoutAllowedMembershipStatus } from "./constants";

export type BreederBillingRow = {
  id: string;
  review_status: string;
  membership_status: string;
  stripe_customer_id: string | null;
};

export type CheckoutMembershipGateResult =
  | { allowed: true; membershipStatus: CheckoutAllowedMembershipStatus }
  | { allowed: false; httpStatus: 403; error: string; reason: "active" | "suspended" | "other" };

export type CheckoutClientInputValidationResult =
  { valid: true } | { valid: false; httpStatus: 400; error: string };

export type CreateCheckoutSessionResult =
  { success: true; url: string } | { success: false; httpStatus: number; error: string };

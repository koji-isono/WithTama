import "server-only";

import { isAdminUser, parseMemberUserRole } from "@/features/auth/types";
import { createClient } from "@/lib/supabase/server";

import { validateCheckoutClientInput } from "./checkout-request";
import { createBreederCheckoutSessionUrl } from "./create-checkout-session";
import {
  BILLING_CHECKOUT_BREEDER_NOT_FOUND_MESSAGE,
  BILLING_CHECKOUT_EMAIL_REQUIRED_MESSAGE,
  BILLING_CHECKOUT_FORBIDDEN_ROLE_MESSAGE,
  BILLING_CHECKOUT_GENERIC_ERROR_MESSAGE,
  BILLING_CHECKOUT_REVIEW_NOT_APPROVED_MESSAGE,
  BILLING_CHECKOUT_UNAUTHORIZED_MESSAGE,
} from "./constants";
import { evaluateCheckoutMembershipGate } from "./membership-gate";
import { getBreederBillingRowByUserId } from "./repository";
import type { CreateCheckoutSessionResult } from "./types";

export async function handleBreederCheckoutRequest(
  body: unknown,
): Promise<CreateCheckoutSessionResult> {
  const clientInput = validateCheckoutClientInput(body);
  if (!clientInput.valid) {
    return {
      success: false,
      httpStatus: clientInput.httpStatus,
      error: clientInput.error,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, httpStatus: 401, error: BILLING_CHECKOUT_UNAUTHORIZED_MESSAGE };
  }

  if (isAdminUser(user)) {
    return { success: false, httpStatus: 403, error: BILLING_CHECKOUT_FORBIDDEN_ROLE_MESSAGE };
  }

  const role = parseMemberUserRole(user);
  if (role !== "breeder") {
    return { success: false, httpStatus: 403, error: BILLING_CHECKOUT_FORBIDDEN_ROLE_MESSAGE };
  }

  const breeder = await getBreederBillingRowByUserId(user.id);
  if (!breeder) {
    return {
      success: false,
      httpStatus: 404,
      error: BILLING_CHECKOUT_BREEDER_NOT_FOUND_MESSAGE,
    };
  }

  if (breeder.review_status !== "approved") {
    return {
      success: false,
      httpStatus: 403,
      error: BILLING_CHECKOUT_REVIEW_NOT_APPROVED_MESSAGE,
    };
  }

  const membershipGate = evaluateCheckoutMembershipGate(breeder.membership_status);
  if (!membershipGate.allowed) {
    return {
      success: false,
      httpStatus: membershipGate.httpStatus,
      error: membershipGate.error,
    };
  }

  const customerEmail = user.email?.trim() || null;
  if (!breeder.stripe_customer_id && !customerEmail) {
    return {
      success: false,
      httpStatus: 400,
      error: BILLING_CHECKOUT_EMAIL_REQUIRED_MESSAGE,
    };
  }

  try {
    const url = await createBreederCheckoutSessionUrl(breeder, customerEmail);
    return { success: true, url };
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.error("[billing/checkout] Stripe Checkout Session creation failed");
    }
    return {
      success: false,
      httpStatus: 500,
      error: BILLING_CHECKOUT_GENERIC_ERROR_MESSAGE,
    };
  }
}

import "server-only";

import { isAdminUser, parseMemberUserRole } from "@/features/auth/types";
import { createClient } from "@/lib/supabase/server";

import { getBreederBillingRowByUserId } from "./repository";
import { createBreederPortalSessionUrl } from "./create-portal-session";
import {
  BILLING_PORTAL_BREEDER_NOT_FOUND_MESSAGE,
  BILLING_PORTAL_FORBIDDEN_ROLE_MESSAGE,
  BILLING_PORTAL_GENERIC_ERROR_MESSAGE,
  BILLING_PORTAL_NO_CUSTOMER_MESSAGE,
  BILLING_PORTAL_REVIEW_NOT_APPROVED_MESSAGE,
  BILLING_PORTAL_UNAUTHORIZED_MESSAGE,
} from "./portal-constants";
import { evaluatePortalMembershipGate } from "./portal-gate";
import { validatePortalClientInput } from "./portal-request";
import type { CreateCheckoutSessionResult } from "./types";

export async function handleBreederPortalRequest(
  body: unknown,
): Promise<CreateCheckoutSessionResult> {
  const clientInput = validatePortalClientInput(body);
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
    return { success: false, httpStatus: 401, error: BILLING_PORTAL_UNAUTHORIZED_MESSAGE };
  }

  if (isAdminUser(user)) {
    return { success: false, httpStatus: 403, error: BILLING_PORTAL_FORBIDDEN_ROLE_MESSAGE };
  }

  const role = parseMemberUserRole(user);
  if (role !== "breeder") {
    return { success: false, httpStatus: 403, error: BILLING_PORTAL_FORBIDDEN_ROLE_MESSAGE };
  }

  const breeder = await getBreederBillingRowByUserId(user.id);
  if (!breeder) {
    return {
      success: false,
      httpStatus: 404,
      error: BILLING_PORTAL_BREEDER_NOT_FOUND_MESSAGE,
    };
  }

  if (breeder.review_status !== "approved") {
    return {
      success: false,
      httpStatus: 403,
      error: BILLING_PORTAL_REVIEW_NOT_APPROVED_MESSAGE,
    };
  }

  const membershipGate = evaluatePortalMembershipGate(breeder.membership_status);
  if (!membershipGate.allowed) {
    return {
      success: false,
      httpStatus: membershipGate.httpStatus,
      error: membershipGate.error,
    };
  }

  if (!breeder.stripe_customer_id) {
    return {
      success: false,
      httpStatus: 400,
      error: BILLING_PORTAL_NO_CUSTOMER_MESSAGE,
    };
  }

  try {
    const url = await createBreederPortalSessionUrl(breeder.stripe_customer_id);
    return { success: true, url };
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.error("[billing/portal] Stripe Portal Session creation failed");
    }
    return {
      success: false,
      httpStatus: 500,
      error: BILLING_PORTAL_GENERIC_ERROR_MESSAGE,
    };
  }
}

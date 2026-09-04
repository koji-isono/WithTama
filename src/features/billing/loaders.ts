import "server-only";

import { requireBreeder } from "@/features/auth/breeder-auth";

import { isMembershipStatus, resolveBillingStatusPresentation } from "./billing-display";
import { formatBillingPeriodEnd } from "./format";
import { getBreederBillingDisplayByUserId } from "./repository";
import type { BreederBillingPageData } from "./types";

export const BREEDER_BILLING_LOAD_ERROR_MESSAGE =
  "月額会費の情報を読み込めませんでした。時間をおいてもう一度お試しください。";

export async function loadBreederBillingPageData(): Promise<BreederBillingPageData> {
  const user = await requireBreeder();

  const row = await getBreederBillingDisplayByUserId(user.id);

  if (!row) {
    throw new Error("Breeder billing row not found");
  }

  const membershipStatus = isMembershipStatus(row.membership_status)
    ? row.membership_status
    : "pending";

  const reviewApproved = row.review_status === "approved";

  const periodEndLabel = formatBillingPeriodEnd(row.subscription_current_period_end);

  const presentation = resolveBillingStatusPresentation({
    membershipStatus,
    subscriptionStatus: row.subscription_status,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    reviewApproved,
    periodEndLabel,
  });

  return {
    presentation,
    periodEndLabel,
    reviewApproved,
  };
}

import "server-only";

import { requireBreeder } from "@/features/auth/breeder-auth";
import { parseCheckoutReturnQuery } from "@/features/billing/billing-display";
import { loadLatestReturnedCommentForBreederSafely } from "@/features/breeder-review";

import { getBreederReviewSummaryByUserId } from "./repository";
import type { BreederDashboardPageData } from "./types";

export async function loadBreederDashboardPageData(input?: {
  checkoutQuery?: string;
}): Promise<BreederDashboardPageData> {
  const user = await requireBreeder();

  const checkoutReturn = parseCheckoutReturnQuery(input?.checkoutQuery);

  const summary = await getBreederReviewSummaryByUserId(user.id);

  if (!summary || summary.review_status !== "resubmission_required") {
    return { resubmissionBanner: null, checkoutReturn };
  }

  const comment = await loadLatestReturnedCommentForBreederSafely(summary.id);

  return {
    resubmissionBanner: { comment },
    checkoutReturn,
  };
}

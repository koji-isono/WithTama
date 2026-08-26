import "server-only";

import { requireBreeder } from "@/features/auth/breeder-auth";
import { loadLatestReturnedCommentForBreederSafely } from "@/features/breeder-review";

import { getBreederReviewSummaryByUserId } from "./repository";
import type { BreederDashboardPageData } from "./types";

export async function loadBreederDashboardPageData(): Promise<BreederDashboardPageData> {
  const user = await requireBreeder();

  const summary = await getBreederReviewSummaryByUserId(user.id);

  if (!summary || summary.review_status !== "resubmission_required") {
    return { resubmissionBanner: null };
  }

  const comment = await loadLatestReturnedCommentForBreederSafely(summary.id);

  return {
    resubmissionBanner: { comment },
  };
}

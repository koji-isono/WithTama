import "server-only";

import { requireBreeder } from "@/features/auth/breeder-auth";

import { getBreederReviewSummaryByUserId, getLatestReturnedComment } from "./repository";
import type { BreederDashboardPageData } from "./types";

function normalizeReturnedComment(comment: string | null): string | null {
  if (comment === null) {
    return null;
  }

  const trimmed = comment.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

async function loadLatestReturnedCommentSafely(): Promise<string | null> {
  try {
    const comment = await getLatestReturnedComment();
    return normalizeReturnedComment(comment);
  } catch {
    return null;
  }
}

export async function loadBreederDashboardPageData(): Promise<BreederDashboardPageData> {
  const user = await requireBreeder();

  const summary = await getBreederReviewSummaryByUserId(user.id);

  if (!summary || summary.review_status !== "resubmission_required") {
    return { resubmissionBanner: null };
  }

  const comment = await loadLatestReturnedCommentSafely();

  return {
    resubmissionBanner: { comment },
  };
}

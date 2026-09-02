import "server-only";

import { redirect } from "next/navigation";

import { requireBreeder } from "@/features/auth/breeder-auth";
import { parseCheckoutReturnQuery } from "@/features/billing/billing-display";
import { ensureBreederProfileContextByUserId } from "@/features/breeder-profile/repository";
import { loadLatestReturnedCommentForBreederSafely } from "@/features/breeder-review";

import type { BreederDashboardPageData } from "./types";

const BREEDER_PROFILE_PATH = "/breeder/profile";

const BREEDER_PROFILE_LOAD_ERROR_MESSAGE =
  "ブリーダー情報を読み込めませんでした。時間をおいて再度お試しください。";

export async function loadBreederDashboardPageData(input?: {
  checkoutQuery?: string;
}): Promise<BreederDashboardPageData> {
  const user = await requireBreeder();

  const checkoutReturn = parseCheckoutReturnQuery(input?.checkoutQuery);

  const context = await ensureBreederProfileContextByUserId(user.id);

  if (!context) {
    throw new Error(BREEDER_PROFILE_LOAD_ERROR_MESSAGE);
  }

  if (!context.profile_completed && context.review_status === "draft") {
    redirect(BREEDER_PROFILE_PATH);
  }

  if (context.review_status !== "resubmission_required") {
    return { resubmissionBanner: null, checkoutReturn };
  }

  const comment = await loadLatestReturnedCommentForBreederSafely(context.id);

  return {
    resubmissionBanner: { comment },
    checkoutReturn,
  };
}

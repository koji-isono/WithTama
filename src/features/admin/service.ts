"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/features/auth/admin-auth";

import { ADMIN_PET_REVIEWS_PATH } from "./constants";
import { mapAdminPetReviewRpcError } from "./errors";
import { approvePetForPublishViaRpc, returnPetReviewViaRpc } from "./repository";
import { validatePetIdForAdminReview, validateReturnReviewComment } from "./validation";

export type AdminPetReviewActionResult = { success: true } | { success: false; error: string };

function revalidateAdminPetReviewPaths(petId: string): void {
  revalidatePath(ADMIN_PET_REVIEWS_PATH);
  revalidatePath(`${ADMIN_PET_REVIEWS_PATH}/${petId}`);
}

export async function approvePetForPublishAction(
  petId: string,
): Promise<AdminPetReviewActionResult> {
  await requireAdmin();

  const petIdError = validatePetIdForAdminReview(petId);

  if (petIdError) {
    return { success: false, error: petIdError };
  }

  try {
    await approvePetForPublishViaRpc(petId);
    revalidateAdminPetReviewPaths(petId);
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("approvePetForPublishAction failed", error);
    }

    return { success: false, error: mapAdminPetReviewRpcError(error) };
  }
}

export async function returnPetReviewAction(
  petId: string,
  comment: string,
): Promise<AdminPetReviewActionResult> {
  await requireAdmin();

  const petIdError = validatePetIdForAdminReview(petId);

  if (petIdError) {
    return { success: false, error: petIdError };
  }

  const commentError = validateReturnReviewComment(comment);

  if (commentError) {
    return { success: false, error: commentError };
  }

  try {
    await returnPetReviewViaRpc(petId, comment.trim());
    revalidateAdminPetReviewPaths(petId);
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("returnPetReviewAction failed", error);
    }

    return { success: false, error: mapAdminPetReviewRpcError(error) };
  }
}

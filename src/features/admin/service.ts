"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/features/auth/admin-auth";

import { ADMIN_BREEDER_REVIEWS_PATH, ADMIN_PET_REVIEWS_PATH } from "./constants";
import { mapAdminBreederReviewRpcError, mapAdminPetReviewRpcError } from "./errors";
import {
  approveBreederReviewViaRpc,
  approvePetForPublishViaRpc,
  rejectBreederReviewViaRpc,
  returnBreederReviewViaRpc,
  returnPetReviewViaRpc,
  startBreederReviewViaRpc,
} from "./repository";
import {
  validateBreederIdForAdminReview,
  validateBreederReviewActionComment,
  validatePetIdForAdminReview,
  validateReturnReviewComment,
} from "./validation";

export type AdminPetReviewActionResult = { success: true } | { success: false; error: string };

export type AdminBreederReviewActionResult = AdminPetReviewActionResult;

function revalidateAdminPetReviewPaths(petId: string): void {
  revalidatePath(ADMIN_PET_REVIEWS_PATH);
  revalidatePath(`${ADMIN_PET_REVIEWS_PATH}/${petId}`);
}

function revalidateAdminBreederReviewPaths(breederId: string): void {
  revalidatePath(ADMIN_BREEDER_REVIEWS_PATH);
  revalidatePath(`${ADMIN_BREEDER_REVIEWS_PATH}/${breederId}`);
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

export async function startBreederReviewAction(
  breederId: string,
): Promise<AdminBreederReviewActionResult> {
  await requireAdmin();

  const breederIdError = validateBreederIdForAdminReview(breederId);

  if (breederIdError) {
    return { success: false, error: breederIdError };
  }

  try {
    await startBreederReviewViaRpc(breederId);
    revalidateAdminBreederReviewPaths(breederId);
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("startBreederReviewAction failed", error);
    }

    return { success: false, error: mapAdminBreederReviewRpcError(error, "start") };
  }
}

export async function approveBreederReviewAction(
  breederId: string,
): Promise<AdminBreederReviewActionResult> {
  await requireAdmin();

  const breederIdError = validateBreederIdForAdminReview(breederId);

  if (breederIdError) {
    return { success: false, error: breederIdError };
  }

  try {
    await approveBreederReviewViaRpc(breederId);
    revalidateAdminBreederReviewPaths(breederId);
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("approveBreederReviewAction failed", error);
    }

    return { success: false, error: mapAdminBreederReviewRpcError(error, "approve") };
  }
}

export async function returnBreederReviewAction(
  breederId: string,
  comment: string,
): Promise<AdminBreederReviewActionResult> {
  await requireAdmin();

  const breederIdError = validateBreederIdForAdminReview(breederId);

  if (breederIdError) {
    return { success: false, error: breederIdError };
  }

  const commentError = validateBreederReviewActionComment(comment, "差戻し理由");

  if (commentError) {
    return { success: false, error: commentError };
  }

  try {
    await returnBreederReviewViaRpc(breederId, comment.trim());
    revalidateAdminBreederReviewPaths(breederId);
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("returnBreederReviewAction failed", error);
    }

    return { success: false, error: mapAdminBreederReviewRpcError(error, "return") };
  }
}

export async function rejectBreederReviewAction(
  breederId: string,
  comment: string,
): Promise<AdminBreederReviewActionResult> {
  await requireAdmin();

  const breederIdError = validateBreederIdForAdminReview(breederId);

  if (breederIdError) {
    return { success: false, error: breederIdError };
  }

  const commentError = validateBreederReviewActionComment(comment, "却下理由");

  if (commentError) {
    return { success: false, error: commentError };
  }

  try {
    await rejectBreederReviewViaRpc(breederId, comment.trim());
    revalidateAdminBreederReviewPaths(breederId);
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("rejectBreederReviewAction failed", error);
    }

    return { success: false, error: mapAdminBreederReviewRpcError(error, "reject") };
  }
}

"use server";

import { isAdminUser, parseMemberUserRole } from "@/features/auth";
import { getBuyerProfileByUserId } from "@/features/buyers/repository";
import { createClient } from "@/lib/supabase/server";

import {
  FAVORITE_ADD_ERROR_MESSAGE,
  FAVORITE_BUYER_NOT_FOUND_MESSAGE,
  FAVORITE_FORBIDDEN_ROLE_MESSAGE,
  FAVORITE_PET_NOT_AVAILABLE_MESSAGE,
  FAVORITE_REMOVE_ERROR_MESSAGE,
  FAVORITE_UNAUTHORIZED_MESSAGE,
} from "./constants";
import {
  deleteFavorite,
  getFavoriteByBuyerAndPet,
  insertFavorite,
  isPublishedPetListable,
} from "./repository";
import type { FavoriteActionResult } from "./types";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

async function resolveBuyerIdForCurrentUser(): Promise<
  { success: true; buyerId: string } | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: FAVORITE_UNAUTHORIZED_MESSAGE };
  }

  if (isAdminUser(user)) {
    return { success: false, error: FAVORITE_FORBIDDEN_ROLE_MESSAGE };
  }

  const role = parseMemberUserRole(user);

  if (role !== "buyer") {
    return { success: false, error: FAVORITE_FORBIDDEN_ROLE_MESSAGE };
  }

  const buyer = await getBuyerProfileByUserId(user.id);

  if (!buyer) {
    return { success: false, error: FAVORITE_BUYER_NOT_FOUND_MESSAGE };
  }

  return { success: true, buyerId: buyer.id };
}

export async function addFavoriteAction(petId: string): Promise<FavoriteActionResult> {
  const normalizedPetId = petId.trim();

  if (!normalizedPetId) {
    return { success: false, error: FAVORITE_PET_NOT_AVAILABLE_MESSAGE };
  }

  const buyerResult = await resolveBuyerIdForCurrentUser();

  if (!buyerResult.success) {
    return { success: false, error: buyerResult.error };
  }

  try {
    const listable = await isPublishedPetListable(normalizedPetId);

    if (!listable) {
      return { success: false, error: FAVORITE_PET_NOT_AVAILABLE_MESSAGE };
    }

    const existing = await getFavoriteByBuyerAndPet(buyerResult.buyerId, normalizedPetId);

    if (existing) {
      return { success: true, isFavorited: true };
    }

    await insertFavorite(buyerResult.buyerId, normalizedPetId);

    return { success: true, isFavorited: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: true, isFavorited: true };
    }

    if (process.env.NODE_ENV === "development") {
      console.error("addFavoriteAction failed", error);
    }

    return { success: false, error: FAVORITE_ADD_ERROR_MESSAGE };
  }
}

export async function removeFavoriteAction(petId: string): Promise<FavoriteActionResult> {
  const normalizedPetId = petId.trim();

  if (!normalizedPetId) {
    return { success: false, error: FAVORITE_PET_NOT_AVAILABLE_MESSAGE };
  }

  const buyerResult = await resolveBuyerIdForCurrentUser();

  if (!buyerResult.success) {
    return { success: false, error: buyerResult.error };
  }

  try {
    await deleteFavorite(buyerResult.buyerId, normalizedPetId);

    return { success: true, isFavorited: false };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("removeFavoriteAction failed", error);
    }

    return { success: false, error: FAVORITE_REMOVE_ERROR_MESSAGE };
  }
}

export async function removeFavoriteFromListAction(petId: string): Promise<FavoriteActionResult> {
  return removeFavoriteAction(petId);
}

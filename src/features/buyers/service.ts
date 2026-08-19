"use server";

import { isAdminUser, parseMemberUserRole } from "@/features/auth";
import { createClient } from "@/lib/supabase/server";

import {
  BUYER_PROFILE_FORBIDDEN_ROLE_MESSAGE,
  BUYER_PROFILE_GENERIC_ERROR_MESSAGE,
  BUYER_PROFILE_UNAUTHORIZED_MESSAGE,
} from "./constants";
import { parseBuyerProfileFormData } from "./form-data";
import { getBuyerProfileByUserId, updateBuyerProfile } from "./repository";
import type { SaveBuyerProfileResult } from "./types";
import {
  buildUpdateBuyerProfileData,
  hasValidationErrors,
  normalizeBuyerProfileInput,
  validateBuyerProfile,
} from "./validation";

export async function saveBuyerProfileAction(formData: FormData): Promise<SaveBuyerProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: BUYER_PROFILE_UNAUTHORIZED_MESSAGE };
  }

  if (isAdminUser(user)) {
    return { success: false, error: BUYER_PROFILE_FORBIDDEN_ROLE_MESSAGE };
  }

  const role = parseMemberUserRole(user);

  if (role !== "buyer") {
    return { success: false, error: BUYER_PROFILE_FORBIDDEN_ROLE_MESSAGE };
  }

  const input = parseBuyerProfileFormData(formData);
  const fieldErrors = validateBuyerProfile(input);

  if (hasValidationErrors(fieldErrors)) {
    return { success: false, fieldErrors };
  }

  const normalized = normalizeBuyerProfileInput(input);
  const updateData = buildUpdateBuyerProfileData(normalized);

  try {
    const existing = await getBuyerProfileByUserId(user.id);

    if (!existing) {
      return {
        success: false,
        error: "購入希望者プロフィールが見つかりません。再度ログインしてください。",
      };
    }

    const updated = await updateBuyerProfile(user.id, updateData);

    return {
      success: true,
      profileCompleted: updated.profile_completed,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("saveBuyerProfileAction failed", error);
    }

    return {
      success: false,
      error: BUYER_PROFILE_GENERIC_ERROR_MESSAGE,
    };
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";

import { updateBasicProfile, updateLocationProfile } from "./repository";
import type {
  BasicProfileInput,
  LocationProfileInput,
  SaveBasicProfileResult,
  SaveLocationProfileResult,
} from "./types";
import {
  hasValidationErrors,
  validateBasicProfile,
  validateLocationProfile,
} from "./validation";

export async function saveBasicProfile(
  input: BasicProfileInput,
): Promise<SaveBasicProfileResult> {
  const fieldErrors = validateBasicProfile(input);

  if (hasValidationErrors(fieldErrors)) {
    return { success: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    await updateBasicProfile(user.id, {
      business_name: input.businessName.trim(),
      representative_name: input.representativeName.trim(),
      phone: input.phone.trim(),
      public_email: input.publicEmail.trim() || null,
      website_url: input.websiteUrl.trim() || null,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "保存に失敗しました。",
    };
  }
}

export async function saveLocationProfile(
  input: LocationProfileInput,
): Promise<SaveLocationProfileResult> {
  const fieldErrors = validateLocationProfile(input);

  if (hasValidationErrors(fieldErrors)) {
    return { success: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    await updateLocationProfile(user.id, {
      postal_code: input.postalCode.trim(),
      prefecture: input.prefecture.trim(),
      city: input.city.trim(),
      address_line: input.addressLine.trim(),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "保存に失敗しました。",
    };
  }
}

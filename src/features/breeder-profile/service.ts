"use server";

import { createClient } from "@/lib/supabase/server";

import { updateBasicProfile } from "./repository";
import type { BasicProfileInput, SaveBasicProfileResult } from "./types";
import { hasValidationErrors, validateBasicProfile } from "./validation";

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

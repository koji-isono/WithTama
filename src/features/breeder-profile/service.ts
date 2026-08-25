"use server";

import { createClient } from "@/lib/supabase/server";

import { formatProfileSaveError } from "./format-save-error";
import { formatBreederDocumentUploadError } from "./format-document-upload-error";
import {
  getVerificationProfile,
  saveBreederDocumentPath,
  updateBasicProfile,
  updateIntroductionProfile,
  updateLicenseProfile,
  updateLocationProfile,
  uploadBreederDocument as uploadBreederDocumentToStorage,
  submitBreederApplication,
} from "./repository";
import { validateProfileCompletion } from "./profile-completion";
import type {
  BasicProfileInput,
  BreederDocumentType,
  CompleteBreederProfileResult,
  IntroductionProfileInput,
  LicenseProfileInput,
  LocationProfileInput,
  SaveBasicProfileResult,
  SaveIntroductionProfileResult,
  SaveLicenseProfileResult,
  SaveLocationProfileResult,
  UploadBreederDocumentResult,
} from "./types";
import { buildBreederDocumentStoragePath, validateBreederDocumentFile } from "./document-utils";
import {
  hasValidationErrors,
  normalizeIntroductionProfileInput,
  normalizeLicenseProfileInput,
  validateBasicProfile,
  validateIntroductionProfile,
  validateLicenseProfile,
  validateLocationProfile,
} from "./validation";

export async function saveBasicProfile(input: BasicProfileInput): Promise<SaveBasicProfileResult> {
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

export async function saveLicenseProfile(
  input: LicenseProfileInput,
): Promise<SaveLicenseProfileResult> {
  const normalized = normalizeLicenseProfileInput(input);
  const fieldErrors = validateLicenseProfile(normalized);

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
    await updateLicenseProfile(user.id, {
      business_registration_type: normalized.businessRegistrationType,
      business_registration_number: normalized.businessRegistrationNumber,
      registration_authority: normalized.registrationAuthority,
      registration_expires_at: normalized.registrationExpiresAt,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatProfileSaveError(error),
    };
  }
}

/**
 * Step 4 ブリーダー紹介の保存。
 *
 * TODO(AI): 第1期では Dify による AI 下書き生成は未実装。
 * 将来: AI 下書き → ブリーダー確認・修正 → 管理者審査 → 公開。
 * AI 生成文の自動公開は行わない。健康・性格・血統・安全性の断定は AI にさせない。
 */
export async function saveIntroductionProfile(
  input: IntroductionProfileInput,
): Promise<SaveIntroductionProfileResult> {
  const normalized = normalizeIntroductionProfileInput(input);
  const fieldErrors = validateIntroductionProfile(normalized);

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
    await updateIntroductionProfile(user.id, {
      profile_text: normalized.profileText,
      breeding_policy: normalized.breedingPolicy,
      health_policy: normalized.healthPolicy,
      breeding_environment: normalized.breedingEnvironment,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatProfileSaveError(error),
    };
  }
}

export async function uploadBreederDocument(
  formData: FormData,
): Promise<UploadBreederDocumentResult> {
  const documentType = formData.get("documentType");
  const file = formData.get("file");

  if (documentType !== "identity" && documentType !== "license") {
    return { success: false, error: "書類種別が不正です。" };
  }

  if (!(file instanceof File)) {
    return { success: false, error: "ファイルを選択してください。" };
  }

  const validationError = validateBreederDocumentFile(file);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  const typedDocumentType = documentType as BreederDocumentType;
  let storagePath: string;

  try {
    storagePath = buildBreederDocumentStoragePath(user.id, typedDocumentType, file);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ファイルを確認してください。",
    };
  }

  try {
    await uploadBreederDocumentToStorage(user.id, typedDocumentType, file, storagePath);

    await saveBreederDocumentPath(user.id, typedDocumentType, storagePath);

    return { success: true, documentType: typedDocumentType };
  } catch (error) {
    return {
      success: false,
      error: formatBreederDocumentUploadError(error, {
        documentType: typedDocumentType,
        storagePath,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    };
  }
}

export async function completeBreederProfile(): Promise<CompleteBreederProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    const profile = await getVerificationProfile(user.id);
    const missingSteps = validateProfileCompletion(profile);

    if (missingSteps.length > 0) {
      return {
        success: false,
        error: "プロフィールの必須項目が不足しています。未入力のステップを確認してください。",
        missingSteps,
      };
    }

    if (!profile) {
      return {
        success: false,
        error: "プロフィールが見つかりません。",
      };
    }

    if (profile.review_status !== "draft") {
      return {
        success: false,
        error: "現在の審査状態では提出できません。",
      };
    }

    await submitBreederApplication();

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (message.includes("authentication required")) {
      return { success: false, error: "ログインが必要です。" };
    }

    if (message.includes("invalid review status")) {
      return {
        success: false,
        error: "現在の審査状態では提出できません。",
      };
    }

    if (message.includes("documents required")) {
      return {
        success: false,
        error: "プロフィールの必須項目が不足しています。未入力のステップを確認してください。",
      };
    }

    if (message.includes("breeder not found")) {
      return {
        success: false,
        error: "プロフィールが見つかりません。",
      };
    }

    return {
      success: false,
      error: formatProfileSaveError(error),
    };
  }
}

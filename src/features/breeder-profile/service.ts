"use server";

import { getCurrentBreeder } from "@/features/auth/breeder-auth";

import { formatInitialSubmitError, formatResubmitError } from "./format-application-submit-error";
import {
  PROFILE_INCOMPLETE_MESSAGE,
  RESUBMIT_INVALID_STATUS_MESSAGE,
  SUBMIT_INVALID_STATUS_MESSAGE,
} from "./application-submit-constants";
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
  resubmitBreederApplication,
} from "./repository";
import { validateProfileCompletion } from "./profile-completion";
import { authorizeEditableBreederProfile } from "./service-auth";
import type {
  BasicProfileInput,
  BreederDocumentType,
  CompleteBreederProfileResult,
  IntroductionProfileInput,
  LicenseProfileInput,
  LocationProfileInput,
  ResubmitBreederProfileResult,
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

  const auth = await authorizeEditableBreederProfile();

  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await updateBasicProfile(auth.userId, {
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
      error: formatProfileSaveError(error),
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

  const auth = await authorizeEditableBreederProfile();

  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await updateLocationProfile(auth.userId, {
      postal_code: input.postalCode.trim(),
      prefecture: input.prefecture.trim(),
      city: input.city.trim(),
      address_line: input.addressLine.trim(),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatProfileSaveError(error),
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

  const auth = await authorizeEditableBreederProfile();

  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await updateLicenseProfile(auth.userId, {
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

  const auth = await authorizeEditableBreederProfile();

  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await updateIntroductionProfile(auth.userId, {
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

  const auth = await authorizeEditableBreederProfile();

  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const typedDocumentType = documentType as BreederDocumentType;
  let storagePath: string;

  try {
    storagePath = buildBreederDocumentStoragePath(auth.userId, typedDocumentType, file);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "ファイルを確認してください。",
    };
  }

  try {
    await uploadBreederDocumentToStorage(auth.userId, typedDocumentType, file, storagePath);

    await saveBreederDocumentPath(auth.userId, typedDocumentType, storagePath);

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
  const user = await getCurrentBreeder();

  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    const profile = await getVerificationProfile(user.id);
    const missingSteps = validateProfileCompletion(profile);

    if (missingSteps.length > 0) {
      return {
        success: false,
        error: PROFILE_INCOMPLETE_MESSAGE,
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
        error: SUBMIT_INVALID_STATUS_MESSAGE,
      };
    }

    await submitBreederApplication();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatInitialSubmitError(error),
    };
  }
}

export async function resubmitBreederProfile(): Promise<ResubmitBreederProfileResult> {
  const user = await getCurrentBreeder();

  if (!user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    const profile = await getVerificationProfile(user.id);

    if (!profile) {
      return {
        success: false,
        error: "プロフィールが見つかりません。",
      };
    }

    const missingSteps = validateProfileCompletion(profile);

    if (missingSteps.length > 0) {
      return {
        success: false,
        error: PROFILE_INCOMPLETE_MESSAGE,
        missingSteps,
      };
    }

    if (profile.review_status !== "resubmission_required") {
      return {
        success: false,
        error: RESUBMIT_INVALID_STATUS_MESSAGE,
      };
    }

    await resubmitBreederApplication();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatResubmitError(error),
    };
  }
}

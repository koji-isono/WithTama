import { getBreederProfileStepBySlug } from "./constants";
import { INTRODUCTION_PROFILE_MIN_LENGTH } from "./types";
import type { ProfileMissingStep, VerificationProfileRow } from "./types";

function isFilled(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function isIntroductionFieldValid(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length >= INTRODUCTION_PROFILE_MIN_LENGTH);
}

export function getMissingProfileSteps(row: VerificationProfileRow): ProfileMissingStep[] {
  const missing: ProfileMissingStep[] = [];

  if (
    !isFilled(row.business_name) ||
    !isFilled(row.representative_name) ||
    !isFilled(row.phone)
  ) {
    missing.push({
      step: 1,
      label: "基本情報",
      path: getBreederProfileStepBySlug("basic").path,
    });
  }

  if (
    !isFilled(row.postal_code) ||
    !isFilled(row.prefecture) ||
    !isFilled(row.city) ||
    !isFilled(row.address_line)
  ) {
    missing.push({
      step: 2,
      label: "所在地",
      path: getBreederProfileStepBySlug("location").path,
    });
  }

  if (
    !isFilled(row.business_registration_type) ||
    !isFilled(row.business_registration_number) ||
    !isFilled(row.registration_authority) ||
    !isFilled(row.registration_expires_at)
  ) {
    missing.push({
      step: 3,
      label: "第一種動物取扱業情報",
      path: getBreederProfileStepBySlug("license").path,
    });
  }

  if (
    !isIntroductionFieldValid(row.profile_text) ||
    !isIntroductionFieldValid(row.breeding_policy) ||
    !isIntroductionFieldValid(row.health_policy) ||
    !isIntroductionFieldValid(row.breeding_environment)
  ) {
    missing.push({
      step: 4,
      label: "ブリーダー紹介",
      path: getBreederProfileStepBySlug("introduction").path,
    });
  }

  if (!isFilled(row.identity_document_path)) {
    missing.push({
      step: 5,
      label: "本人確認書類",
      path: getBreederProfileStepBySlug("verification").path,
    });
  }

  if (!isFilled(row.business_license_path)) {
    missing.push({
      step: 5,
      label: "第一種動物取扱業登録証",
      path: getBreederProfileStepBySlug("verification").path,
    });
  }

  return missing;
}

export function validateProfileCompletion(row: VerificationProfileRow | null): ProfileMissingStep[] {
  if (!row) {
    return [
      {
        step: 1,
        label: "基本情報",
        path: getBreederProfileStepBySlug("basic").path,
      },
    ];
  }

  return getMissingProfileSteps(row);
}

export function isProfileReadyForCompletion(row: VerificationProfileRow | null): boolean {
  return validateProfileCompletion(row).length === 0;
}

import { JAPAN_PREFECTURES } from "./prefectures";
import { BUSINESS_REGISTRATION_TYPES } from "./registration-types";
import type {
  BasicProfileFieldErrors,
  BasicProfileInput,
  IntroductionProfileErrors,
  IntroductionProfileInput,
  LicenseProfileErrors,
  LicenseProfileInput,
  LocationProfileFieldErrors,
  LocationProfileInput,
} from "./types";
import {
  INTRODUCTION_PROFILE_MAX_LENGTH,
  INTRODUCTION_PROFILE_MIN_LENGTH,
} from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_CODE_PATTERN = /^\d{3}-\d{4}$/;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateBasicProfile(input: BasicProfileInput): BasicProfileFieldErrors {
  const errors: BasicProfileFieldErrors = {};

  if (!input.businessName.trim()) {
    errors.businessName = "屋号・事業所名を入力してください。";
  }

  if (!input.representativeName.trim()) {
    errors.representativeName = "代表者氏名を入力してください。";
  }

  if (!input.phone.trim()) {
    errors.phone = "電話番号を入力してください。";
  }

  const publicEmail = input.publicEmail.trim();
  if (publicEmail && !EMAIL_PATTERN.test(publicEmail)) {
    errors.publicEmail = "メールアドレスの形式が正しくありません。";
  }

  const websiteUrl = input.websiteUrl.trim();
  if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
    errors.websiteUrl = "URLの形式が正しくありません。";
  }

  return errors;
}

export function validateLocationProfile(
  input: LocationProfileInput,
): LocationProfileFieldErrors {
  const errors: LocationProfileFieldErrors = {};

  const postalCode = input.postalCode.trim();
  if (!postalCode) {
    errors.postalCode = "郵便番号を入力してください。";
  } else if (!POSTAL_CODE_PATTERN.test(postalCode)) {
    errors.postalCode = "郵便番号は NNN-NNNN 形式で入力してください。";
  }

  const prefecture = input.prefecture.trim();
  if (!prefecture) {
    errors.prefecture = "都道府県を選択してください。";
  } else if (!JAPAN_PREFECTURES.includes(prefecture as (typeof JAPAN_PREFECTURES)[number])) {
    errors.prefecture = "都道府県を選択してください。";
  }

  if (!input.city.trim()) {
    errors.city = "市区町村を入力してください。";
  }

  if (!input.addressLine.trim()) {
    errors.addressLine = "住所を入力してください。";
  }

  return errors;
}

export function normalizeLicenseProfileInput(input: LicenseProfileInput): LicenseProfileInput {
  return {
    businessRegistrationType: input.businessRegistrationType.trim(),
    businessRegistrationNumber: input.businessRegistrationNumber.trim(),
    registrationAuthority: input.registrationAuthority.trim(),
    registrationExpiresAt: input.registrationExpiresAt.trim(),
  };
}

function isTodayOrFutureDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const inputDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate >= today;
}

export function validateLicenseProfile(input: LicenseProfileInput): LicenseProfileErrors {
  const normalized = normalizeLicenseProfileInput(input);
  const errors: LicenseProfileErrors = {};

  if (!normalized.businessRegistrationType) {
    errors.businessRegistrationType = "登録種別を選択してください。";
  } else if (
    !BUSINESS_REGISTRATION_TYPES.includes(
      normalized.businessRegistrationType as (typeof BUSINESS_REGISTRATION_TYPES)[number],
    )
  ) {
    errors.businessRegistrationType = "登録種別を選択してください。";
  }

  if (!normalized.businessRegistrationNumber) {
    errors.businessRegistrationNumber = "登録番号を入力してください。";
  }

  if (!normalized.registrationAuthority) {
    errors.registrationAuthority = "登録自治体を入力してください。";
  }

  if (!normalized.registrationExpiresAt) {
    errors.registrationExpiresAt = "有効期限を入力してください。";
  } else if (!isTodayOrFutureDate(normalized.registrationExpiresAt)) {
    errors.registrationExpiresAt = "有効期限は本日以降の日付を入力してください。";
  }

  return errors;
}

const INTRODUCTION_FIELD_LABELS: Record<keyof IntroductionProfileInput, string> = {
  profileText: "ブリーダー紹介",
  breedingPolicy: "繁殖方針",
  healthPolicy: "健康管理方針",
  breedingEnvironment: "飼育環境",
};

export function normalizeIntroductionProfileInput(
  input: IntroductionProfileInput,
): IntroductionProfileInput {
  return {
    profileText: input.profileText.trim(),
    breedingPolicy: input.breedingPolicy.trim(),
    healthPolicy: input.healthPolicy.trim(),
    breedingEnvironment: input.breedingEnvironment.trim(),
  };
}

function validateIntroductionField(
  value: string,
  label: string,
): string | undefined {
  if (!value) {
    return `${label}を入力してください。`;
  }

  if (value.length < INTRODUCTION_PROFILE_MIN_LENGTH) {
    return `${label}は${INTRODUCTION_PROFILE_MIN_LENGTH}文字以上で入力してください。`;
  }

  if (value.length > INTRODUCTION_PROFILE_MAX_LENGTH) {
    return `${label}は${INTRODUCTION_PROFILE_MAX_LENGTH}文字以内で入力してください。`;
  }

  return undefined;
}

export function validateIntroductionProfile(
  input: IntroductionProfileInput,
): IntroductionProfileErrors {
  const normalized = normalizeIntroductionProfileInput(input);
  const errors: IntroductionProfileErrors = {};

  for (const key of Object.keys(INTRODUCTION_FIELD_LABELS) as Array<
    keyof IntroductionProfileInput
  >) {
    const error = validateIntroductionField(normalized[key], INTRODUCTION_FIELD_LABELS[key]);

    if (error) {
      errors[key] = error;
    }
  }

  return errors;
}

export function hasValidationErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

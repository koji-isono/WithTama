import { JAPAN_PREFECTURES } from "./prefectures";
import type {
  BasicProfileFieldErrors,
  BasicProfileInput,
  LocationProfileFieldErrors,
  LocationProfileInput,
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

export function hasValidationErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

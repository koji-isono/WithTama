import type { BasicProfileFieldErrors, BasicProfileInput } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function hasValidationErrors(errors: BasicProfileFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

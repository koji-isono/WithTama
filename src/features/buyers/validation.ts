import {
  BUYER_PREFERRED_SPECIES_VALUES,
  BUYER_PROFILE_CITY_MAX_LENGTH,
  BUYER_PROFILE_DISPLAY_NAME_MAX_LENGTH,
  BUYER_PROFILE_FULL_NAME_MAX_LENGTH,
  BUYER_PROFILE_PREFERRED_BREED_MAX_LENGTH,
  BUYER_PROFILE_TEXT_MAX_LENGTH,
  type BuyerPreferredSpecies,
} from "./constants";
import { isBuyerProfileComplete } from "./profile-completion";
import type {
  BuyerProfileFieldErrors,
  BuyerProfileInput,
  NormalizedBuyerProfileInput,
  UpdateBuyerProfileData,
} from "./types";
import { JAPAN_PREFECTURES } from "../breeder-profile/prefectures";

const PHONE_ALLOWED_PATTERN = /^[\d\s\-()]+$/;

function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

function optionalTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePreferredSpecies(value: string): BuyerPreferredSpecies | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if ((BUYER_PREFERRED_SPECIES_VALUES as readonly string[]).includes(trimmed)) {
    return trimmed as BuyerPreferredSpecies;
  }

  return null;
}

export function normalizeBuyerProfileInput(input: BuyerProfileInput): NormalizedBuyerProfileInput {
  const preferredSpeciesRaw = input.preferredSpecies.trim();
  const parsedSpecies = parsePreferredSpecies(preferredSpeciesRaw);

  return {
    fullName: input.fullName.trim(),
    displayName: input.displayName.trim(),
    phone: input.phone.trim(),
    prefecture: input.prefecture.trim(),
    city: input.city.trim(),
    profileText: optionalTrimmed(input.profileText),
    preferredSpecies: preferredSpeciesRaw ? parsedSpecies : null,
    preferredBreed: optionalTrimmed(input.preferredBreed),
    notificationEnabled: input.notificationEnabled,
  };
}

export function validateBuyerProfile(input: BuyerProfileInput): BuyerProfileFieldErrors {
  const normalized = normalizeBuyerProfileInput(input);
  const errors: BuyerProfileFieldErrors = {};

  if (!normalized.fullName) {
    errors.fullName = "氏名を入力してください。";
  } else if (normalized.fullName.length > BUYER_PROFILE_FULL_NAME_MAX_LENGTH) {
    errors.fullName = `${BUYER_PROFILE_FULL_NAME_MAX_LENGTH}文字以内で入力してください。`;
  }

  if (!normalized.displayName) {
    errors.displayName = "表示名を入力してください。";
  } else if (normalized.displayName.length > BUYER_PROFILE_DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = `${BUYER_PROFILE_DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください。`;
  }

  if (!normalized.phone) {
    errors.phone = "電話番号を入力してください。";
  } else if (!PHONE_ALLOWED_PATTERN.test(normalized.phone)) {
    errors.phone = "電話番号の形式が正しくありません。";
  } else {
    const digitCount = countPhoneDigits(normalized.phone);

    if (digitCount < 10 || digitCount > 11) {
      errors.phone = "電話番号の形式が正しくありません。";
    }
  }

  if (!normalized.prefecture) {
    errors.prefecture = "都道府県を選択してください。";
  } else if (
    !JAPAN_PREFECTURES.includes(normalized.prefecture as (typeof JAPAN_PREFECTURES)[number])
  ) {
    errors.prefecture = "都道府県を選択してください。";
  }

  if (!normalized.city) {
    errors.city = "市区町村を入力してください。";
  } else if (normalized.city.length > BUYER_PROFILE_CITY_MAX_LENGTH) {
    errors.city = `${BUYER_PROFILE_CITY_MAX_LENGTH}文字以内で入力してください。`;
  }

  if (normalized.profileText && normalized.profileText.length > BUYER_PROFILE_TEXT_MAX_LENGTH) {
    errors.profileText = `${BUYER_PROFILE_TEXT_MAX_LENGTH}文字以内で入力してください。`;
  }

  const preferredSpeciesRaw = input.preferredSpecies.trim();

  if (preferredSpeciesRaw && normalized.preferredSpecies === null) {
    errors.preferredSpecies = "希望する種類の値が不正です。";
  }

  if (
    normalized.preferredBreed &&
    normalized.preferredBreed.length > BUYER_PROFILE_PREFERRED_BREED_MAX_LENGTH
  ) {
    errors.preferredBreed = `${BUYER_PROFILE_PREFERRED_BREED_MAX_LENGTH}文字以内で入力してください。`;
  }

  return errors;
}

export function hasValidationErrors(errors: BuyerProfileFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Server 側で profile_completed を算出。クライアント入力は使用しない。 */
export function buildUpdateBuyerProfileData(
  normalized: NormalizedBuyerProfileInput,
): UpdateBuyerProfileData {
  return {
    display_name: normalized.displayName,
    full_name: normalized.fullName,
    phone: normalized.phone,
    prefecture: normalized.prefecture,
    city: normalized.city,
    profile_text: normalized.profileText,
    preferred_species: normalized.preferredSpecies,
    preferred_breed: normalized.preferredBreed,
    notification_enabled: normalized.notificationEnabled,
    profile_completed: isBuyerProfileComplete(normalized),
  };
}

export const BUYER_PROFILE_UPDATABLE_COLUMNS = [
  "display_name",
  "full_name",
  "phone",
  "prefecture",
  "city",
  "profile_text",
  "preferred_species",
  "preferred_breed",
  "notification_enabled",
  "profile_completed",
] as const;

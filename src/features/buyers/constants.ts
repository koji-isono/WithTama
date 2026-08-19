/** BY-01 設計値（DB CHECK なし） */
export const BUYER_PROFILE_FULL_NAME_MAX_LENGTH = 80;
export const BUYER_PROFILE_DISPLAY_NAME_MAX_LENGTH = 40;
export const BUYER_PROFILE_CITY_MAX_LENGTH = 100;
export const BUYER_PROFILE_TEXT_MAX_LENGTH = 1000;
export const BUYER_PROFILE_PREFERRED_BREED_MAX_LENGTH = 100;

export const BUYER_PREFERRED_SPECIES_VALUES = ["dog", "cat", "both"] as const;

export type BuyerPreferredSpecies = (typeof BUYER_PREFERRED_SPECIES_VALUES)[number];

export const BUYER_PROFILE_GENERIC_ERROR_MESSAGE =
  "保存に失敗しました。時間をおいて再度お試しください。";

export const BUYER_PROFILE_UNAUTHORIZED_MESSAGE = "ログインが必要です。";

export const BUYER_PROFILE_FORBIDDEN_ROLE_MESSAGE =
  "購入希望者アカウントでのみプロフィールを保存できます。";

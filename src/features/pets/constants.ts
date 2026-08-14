import type { PetStatus } from "./types";

export const BREEDER_PETS_PATH = "/breeder/pets";
export const BREEDER_PETS_NEW_PATH = "/breeder/pets/new";
export const PUBLIC_PETS_PATH = "/pets";

export const PET_TEMPERAMENT_MAX_LENGTH = 500;
export const PET_PRICE_COMMENT_MAX_LENGTH = 500;

export const PET_REGISTRATION_SCREEN_ID = "BR-10";
export const PET_LIST_SCREEN_ID = "BR-10";
export const PET_EDIT_SCREEN_ID = "BR-11";
export const PUBLIC_PET_LIST_SCREEN_ID = "PU-01";
export const PUBLIC_PET_DETAIL_SCREEN_ID = "PU-02";

export const PET_SPECIES_OPTIONS = [
  { value: "dog" as const, label: "犬" },
  { value: "cat" as const, label: "猫" },
];

export const PET_SEX_OPTIONS = [
  { value: "male" as const, label: "オス" },
  { value: "female" as const, label: "メス" },
];

export const PET_STATUS_LABELS: Record<PetStatus, string> = {
  draft: "下書き",
  under_review: "審査中",
  published: "公開中",
  paused: "一時停止",
  family_decided: "家族決定",
  closed: "掲載終了",
};

export function getPetEditPath(petId: string): string {
  return `/breeder/pets/${petId}/edit`;
}

export function getPublicPetDetailPath(petId: string): string {
  return `/pets/${petId}`;
}

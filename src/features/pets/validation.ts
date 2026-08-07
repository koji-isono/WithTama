import {
  PET_PRICE_COMMENT_MAX_LENGTH,
  PET_SPECIES_OPTIONS,
  PET_SEX_OPTIONS,
  PET_TEMPERAMENT_MAX_LENGTH,
} from "./constants";
import { PET_PHOTO_MAX_COUNT } from "./photo-constants";
import { validatePetPhotoFile } from "./photo-validation";
import type {
  CreatePetDraftFieldErrors,
  CreatePetDraftInput,
  NormalizedCreatePetDraftInput,
  PetSex,
  PetSpecies,
} from "./types";

function isFutureDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const inputDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  return inputDate > today;
}

function parsePrice(value: string): number | null | "invalid" {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    return "invalid";
  }

  return Number.parseInt(trimmed, 10);
}

export function normalizeCreatePetDraftInput(
  input: CreatePetDraftInput,
): NormalizedCreatePetDraftInput {
  const price = parsePrice(input.price);

  return {
    managementName: input.managementName.trim(),
    publicDisplayName: input.publicDisplayName.trim(),
    species: input.species as PetSpecies,
    breed: input.breed.trim(),
    sex: input.sex as PetSex,
    birthday: input.birthday.trim() || null,
    color: input.color.trim() || null,
    temperament: input.temperament.trim() || null,
    price: price === "invalid" ? null : price,
    priceComment: input.priceComment.trim() || null,
  };
}

export function validateCreatePetDraftInput(
  input: CreatePetDraftInput,
): CreatePetDraftFieldErrors {
  const normalized = normalizeCreatePetDraftInput(input);
  const errors: CreatePetDraftFieldErrors = {};

  if (!normalized.managementName) {
    errors.managementName = "管理名を入力してください。";
  }

  if (!normalized.publicDisplayName) {
    errors.publicDisplayName = "公開表示名を入力してください。";
  }

  if (!input.species) {
    errors.species = "犬猫種別を選択してください。";
  } else if (!PET_SPECIES_OPTIONS.some((option) => option.value === input.species)) {
    errors.species = "犬猫種別を選択してください。";
  }

  if (!normalized.breed) {
    errors.breed = "犬種・猫種を入力してください。";
  }

  if (!input.sex) {
    errors.sex = "性別を選択してください。";
  } else if (!PET_SEX_OPTIONS.some((option) => option.value === input.sex)) {
    errors.sex = "性別を選択してください。";
  }

  if (normalized.birthday && isFutureDate(normalized.birthday)) {
    errors.birthday = "誕生日は本日以前の日付を入力してください。";
  }

  if (normalized.temperament && normalized.temperament.length > PET_TEMPERAMENT_MAX_LENGTH) {
    errors.temperament = `性格は${PET_TEMPERAMENT_MAX_LENGTH}文字以内で入力してください。`;
  }

  const parsedPrice = parsePrice(input.price);

  if (parsedPrice === "invalid") {
    errors.price = "価格は0以上の整数で入力してください。";
  }

  if (normalized.priceComment && normalized.priceComment.length > PET_PRICE_COMMENT_MAX_LENGTH) {
    errors.priceComment = `価格補足は${PET_PRICE_COMMENT_MAX_LENGTH}文字以内で入力してください。`;
  }

  return errors;
}

/** @deprecated Use validateCreatePetDraftInput */
export const validateCreatePetInput = validateCreatePetDraftInput;

/** @deprecated Use validateCreatePetDraftInput */
export const validatePetDraftInput = validateCreatePetDraftInput;

export function hasPetValidationErrors(errors: CreatePetDraftFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function validatePetPhotoUpload(file: File | null, currentPhotoCount: number): string | null {
  if (currentPhotoCount >= PET_PHOTO_MAX_COUNT) {
    return `写真は${PET_PHOTO_MAX_COUNT}枚まで登録できます。`;
  }

  if (!file) {
    return "ファイルを選択してください。";
  }

  return validatePetPhotoFile(file);
}

export const PET_REVIEW_SUBMIT_PHOTO_REQUIRED_MESSAGE =
  "公開申請には写真を1枚以上登録してください。";

export const PET_REVIEW_SUBMIT_STATUS_INVALID_MESSAGE =
  "この犬猫は現在、公開申請できません。";

export const PET_REVIEW_SUBMIT_GENERIC_ERROR_MESSAGE = "公開申請に失敗しました。";

export function validatePetForReviewSubmit(pet: {
  management_name: string;
  public_display_name: string;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  color: string | null;
  temperament: string | null;
  price: number | null;
  price_comment: string | null;
}): string | null {
  const input = {
    managementName: pet.management_name,
    publicDisplayName: pet.public_display_name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    birthday: pet.birthday ?? "",
    color: pet.color ?? "",
    temperament: pet.temperament ?? "",
    price: pet.price != null ? String(pet.price) : "",
    priceComment: pet.price_comment ?? "",
  };

  const errors = validateCreatePetDraftInput(input);

  if (hasPetValidationErrors(errors)) {
    const firstError = Object.values(errors).find(Boolean);

    return firstError ?? "公開申請に必要な情報が不足しています。";
  }

  return null;
}

import { PET_SPECIES_OPTIONS, PET_SEX_OPTIONS } from "./constants";
import type { PetSex, PetSpecies } from "./types";

export function getSpeciesLabel(species: PetSpecies): string {
  return PET_SPECIES_OPTIONS.find((option) => option.value === species)?.label ?? species;
}

export function getSexLabel(sex: PetSex): string {
  return PET_SEX_OPTIONS.find((option) => option.value === sex)?.label ?? sex;
}

export function formatPetPrice(price: number | null): string {
  if (price == null) {
    return "価格未設定";
  }

  return `${new Intl.NumberFormat("ja-JP").format(price)}円`;
}

export function formatPetBirthday(birthday: string | null): string {
  if (!birthday) {
    return "未登録";
  }

  const [year, month, day] = birthday.split("-");

  if (!year || !month || !day) {
    return birthday;
  }

  return `${year}/${month}/${day}`;
}

export function formatPetUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

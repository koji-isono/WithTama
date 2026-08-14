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

/** PU-01 公開一覧 — 女の子 / 男の子 */
export function getPublicSexLabel(sex: PetSex): string {
  if (sex === "male") {
    return "男の子";
  }

  if (sex === "female") {
    return "女の子";
  }

  return getSexLabel(sex);
}

/** PU-01 公開一覧 — 月齢（NULL は「未登録」） */
export function formatPublicPetAge(birthday: string | null): string {
  if (!birthday) {
    return "未登録";
  }

  const birth = new Date(birthday);

  if (Number.isNaN(birth.getTime())) {
    return "未登録";
  }

  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }

  months = Math.max(0, months);

  return `${months}か月`;
}

export function formatPublicBreederLocation(
  businessName: string | null,
  prefecture: string | null,
): string {
  const name = businessName?.trim() || "名称未設定";
  const location = prefecture?.trim();

  if (!location) {
    return name;
  }

  return `${name}（${location}）`;
}

export function formatPublicPetAttributeLine(input: {
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
}): string {
  return [
    getSpeciesLabel(input.species),
    input.breed,
    getPublicSexLabel(input.sex),
    formatPublicPetAge(input.birthday),
  ].join(" · ");
}

export function formatPublicBreederAddress(
  prefecture: string | null,
  city: string | null,
): string | null {
  const parts = [prefecture?.trim(), city?.trim()].filter(Boolean) as string[];

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" ");
}

export function formatPublicPetPhotoAlt(
  publicDisplayName: string,
  index: number,
  total: number,
): string {
  return `${publicDisplayName}の写真（${index}/${total}）`;
}

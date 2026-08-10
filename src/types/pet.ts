export type PetSpecies = "dog" | "cat";
export type PetSex = "male" | "female";
export type PetStatus =
  "draft" | "under_review" | "published" | "paused" | "family_decided" | "closed";

/** Supabase public.pets 行型（Version 1.1） */
export type PetRow = {
  id: string;
  breeder_id: string | null;
  management_name: string;
  public_display_name: string | null;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  color: string | null;
  temperament: string | null;
  description: string | null;
  ai_description: string | null;
  ai_generated_at: string | null;
  price: number | null;
  price_comment: string | null;
  status: PetStatus;
  published_at: string | null;
  display_order: number;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

/** BR-07 一覧表示用 */
export type BreederPetListItem = {
  id: string;
  managementName: string;
  publicDisplayName: string | null;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  sexLabel: string;
  age: string;
  status: PetStatus;
  statusLabel: string;
  photoCount: number;
  matchCount: number;
  imageGradient: string;
};

export type FetchPetsResult =
  { ok: true; pets: BreederPetListItem[] } | { ok: false; error: string };

export type CreatePetInput = {
  managementName: string;
  breed: string;
  sex: PetSex;
  birthday: string;
  species?: PetSpecies;
};

export const PET_SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: "犬",
  cat: "猫",
};

export const PET_SEX_LABELS: Record<PetSex, string> = {
  male: "男の子",
  female: "女の子",
};

export const PET_STATUS_LABELS: Record<PetStatus, string> = {
  draft: "下書き",
  under_review: "審査中",
  published: "掲載中",
  paused: "一時停止",
  family_decided: "家族決定",
  closed: "クローズ",
};

const PET_IMAGE_GRADIENTS = [
  "from-rose-100 via-orange-50 to-amber-100",
  "from-stone-100 via-neutral-50 to-zinc-100",
  "from-sky-100 via-amber-50 to-orange-100",
  "from-emerald-100 via-teal-50 to-cyan-100",
] as const;

export function formatPetAge(birthday: string | null): string {
  if (!birthday) return "—";

  const birth = new Date(birthday);
  const now = new Date();

  if (Number.isNaN(birth.getTime())) return "—";

  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }

  months = Math.max(0, months);

  if (months < 12) {
    return `${months}か月`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years}歳`;
  }

  return `${years}歳${remainingMonths}か月`;
}

export function getPetImageGradient(id: string): string {
  const code = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return PET_IMAGE_GRADIENTS[code % PET_IMAGE_GRADIENTS.length];
}

export function mapPetRowToListItem(row: PetRow): BreederPetListItem {
  return {
    id: row.id,
    managementName: row.management_name,
    publicDisplayName: row.public_display_name,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    sexLabel: PET_SEX_LABELS[row.sex],
    age: formatPetAge(row.birthday),
    status: row.status,
    statusLabel: PET_STATUS_LABELS[row.status],
    photoCount: 0,
    matchCount: 0,
    imageGradient: getPetImageGradient(row.id),
  };
}

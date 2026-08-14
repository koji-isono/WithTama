export type PetSpecies = "dog" | "cat";
export type PetSex = "male" | "female";
export type PetStatus =
  "draft" | "under_review" | "published" | "paused" | "family_decided" | "closed";

/** Supabase public.pets 行型（一覧・Repository 用） */
export type PetRow = {
  id: string;
  breeder_id: string | null;
  management_name: string;
  public_display_name: string | null;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  status: PetStatus;
  display_order: number;
  created_at: string;
};

export type PetListItem = {
  id: string;
  managementName: string;
  publicDisplayName: string | null;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  status: PetStatus;
};

/** ブリーダー犬猫一覧画面用 DTO */
export type BreederPetListItem = {
  id: string;
  managementName: string;
  publicDisplayName: string;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  price: number | null;
  status: PetStatus;
  updatedAt: string;
  mainPhotoUrl: string | null;
};

/** Repository: 一覧 + メイン写真 Signed URL */
export type PetListWithMainPhotoRow = {
  id: string;
  management_name: string;
  public_display_name: string | null;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  price: number | null;
  status: PetStatus;
  updated_at: string;
  main_photo_signed_url: string | null;
};

export type LoadBreederPetsResult =
  { success: true; pets: BreederPetListItem[] } | { success: false; error: string };

export type CreatePetDraftInput = {
  managementName: string;
  publicDisplayName: string;
  species: PetSpecies | "";
  breed: string;
  sex: PetSex | "";
  birthday: string;
  color: string;
  temperament: string;
  price: string;
  priceComment: string;
};

export type CreatePetDraftFieldKey = keyof CreatePetDraftInput;

export type CreatePetDraftFieldErrors = Partial<Record<CreatePetDraftFieldKey, string>>;

export const INITIAL_CREATE_PET_DRAFT_INPUT: CreatePetDraftInput = {
  managementName: "",
  publicDisplayName: "",
  species: "",
  breed: "",
  sex: "",
  birthday: "",
  color: "",
  temperament: "",
  price: "",
  priceComment: "",
};

export type NormalizedCreatePetDraftInput = {
  managementName: string;
  publicDisplayName: string;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  color: string | null;
  temperament: string | null;
  price: number | null;
  priceComment: string | null;
};

export type InsertPetData = {
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
  status: "draft";
  display_order: 0;
  created_by: string;
  updated_by: string;
};

export type CreatePetDraftResult =
  | { success: true; petId: string }
  | { success: false; fieldErrors?: CreatePetDraftFieldErrors; error?: string };

export type PetEditRow = {
  id: string;
  breeder_id: string;
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
  status: PetStatus;
};

export type PetPhotoRow = {
  id: string;
  pet_id: string;
  storage_path: string;
  display_order: number;
  is_main: boolean;
  alt_text: string | null;
  created_at: string;
  updated_at: string;
};

export type PetPhotoListItem = {
  id: string;
  storagePath: string;
  displayOrder: number;
  isMain: boolean;
  altText: string | null;
  createdAt: string;
  signedUrl: string;
};

export type InsertPetPhotoData = {
  storage_path: string;
  display_order: number;
  is_main: boolean;
  alt_text: string;
};

export type PetEditPageData = {
  petId: string;
  status: PetStatus;
  input: CreatePetDraftInput;
  photos: PetPhotoListItem[];
};

export type UploadPetPhotoResult =
  { success: true; photoId: string } | { success: false; error: string };

export type PetPhotoActionResult = { success: true } | { success: false; error: string };

export type SubmitPetForReviewResult = { success: true } | { success: false; error: string };

/** published_pets_public View 行（Repository 用） */
export type PublishedPetPublicRow = {
  id: string;
  public_display_name: string | null;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  price: number | null;
  breeder_id: string;
};

/** breeder_public_profiles View 行（Repository 用） */
export type BreederPublicProfileRow = {
  id: string;
  business_name: string | null;
  prefecture: string | null;
};

/** PU-01 公開犬猫一覧カード DTO */
export type PublicPetListItem = {
  id: string;
  publicDisplayName: string;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  price: number | null;
  breederBusinessName: string | null;
  breederPrefecture: string | null;
  mainPhotoUrl: string | null;
};

export type LoadPublicPetsPageResult =
  { success: true; pets: PublicPetListItem[] } | { success: false; error: string };

/** published_pet_detail_public View 行（Repository 用） */
export type PublishedPetDetailPublicRow = {
  id: string;
  public_display_name: string | null;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  color: string | null;
  temperament: string | null;
  description: string | null;
  price: number | null;
  price_comment: string | null;
  breeder_id: string;
};

/** breeder_public_detail_profiles View 行（Repository 用） */
export type BreederPublicDetailProfileRow = {
  id: string;
  business_name: string | null;
  prefecture: string | null;
  city: string | null;
  profile_text: string | null;
  breeding_policy: string | null;
  health_policy: string | null;
  breeding_environment: string | null;
};

export type PublicPetDetailPhoto = {
  id: string;
  signedUrl: string;
  alt: string;
};

export type PublicBreederDetail = {
  businessName: string | null;
  prefecture: string | null;
  city: string | null;
  profileText: string | null;
  breedingPolicy: string | null;
  healthPolicy: string | null;
  breedingEnvironment: string | null;
};

/** PU-02 公開犬猫詳細 DTO（breeder_id / storage_path 非含有） */
export type PublicPetDetail = {
  id: string;
  publicDisplayName: string;
  species: PetSpecies;
  breed: string;
  sex: PetSex;
  birthday: string | null;
  color: string | null;
  temperament: string | null;
  description: string | null;
  price: number | null;
  priceComment: string | null;
  photos: PublicPetDetailPhoto[];
  breeder: PublicBreederDetail | null;
};

export type LoadPublicPetDetailPageResult =
  | { success: true; detail: PublicPetDetail }
  | { success: false; notFound: true }
  | { success: false; error: string };

export type UpdatePetDraftData = {
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
  updated_by: string;
};

export type UpdatePetDraftResult =
  { success: true } | { success: false; fieldErrors?: CreatePetDraftFieldErrors; error?: string };

/** @deprecated Use CreatePetDraftInput */
export type CreatePetInput = CreatePetDraftInput;

/** @deprecated Use CreatePetDraftFieldErrors */
export type CreatePetFieldErrors = CreatePetDraftFieldErrors;

/** @deprecated Use CreatePetDraftResult */
export type SavePetResult = CreatePetDraftResult;

export function mapPetListWithMainPhotoToBreederPetListItem(
  row: PetListWithMainPhotoRow,
): BreederPetListItem {
  return {
    id: row.id,
    managementName: row.management_name,
    publicDisplayName: row.public_display_name ?? "",
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    birthday: row.birthday,
    price: row.price,
    status: row.status,
    updatedAt: row.updated_at,
    mainPhotoUrl: row.main_photo_signed_url,
  };
}

export function mapPetRowToListItem(row: PetRow): PetListItem {
  return {
    id: row.id,
    managementName: row.management_name,
    publicDisplayName: row.public_display_name,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    status: row.status,
  };
}

export function mapPetPhotoRowToListItem(row: PetPhotoRow, signedUrl: string): PetPhotoListItem {
  return {
    id: row.id,
    storagePath: row.storage_path,
    displayOrder: row.display_order,
    isMain: row.is_main,
    altText: row.alt_text,
    createdAt: row.created_at,
    signedUrl,
  };
}

export function mapPublishedPetPublicRowToListItem(
  row: PublishedPetPublicRow,
  breeder: BreederPublicProfileRow | null,
  mainPhotoUrl: string | null,
): PublicPetListItem {
  return {
    id: row.id,
    publicDisplayName: row.public_display_name?.trim() || "名称未設定",
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    birthday: row.birthday,
    price: row.price,
    breederBusinessName: breeder?.business_name ?? null,
    breederPrefecture: breeder?.prefecture ?? null,
    mainPhotoUrl,
  };
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function mapBreederPublicDetailProfileRow(
  row: BreederPublicDetailProfileRow,
): PublicBreederDetail {
  return {
    businessName: trimToNull(row.business_name),
    prefecture: trimToNull(row.prefecture),
    city: trimToNull(row.city),
    profileText: trimToNull(row.profile_text),
    breedingPolicy: trimToNull(row.breeding_policy),
    healthPolicy: trimToNull(row.health_policy),
    breedingEnvironment: trimToNull(row.breeding_environment),
  };
}

export function mapPublishedPetDetailPublicRow(
  row: PublishedPetDetailPublicRow,
  breeder: PublicBreederDetail | null,
  photos: PublicPetDetailPhoto[],
): PublicPetDetail {
  return {
    id: row.id,
    publicDisplayName: row.public_display_name?.trim() || "名称未設定",
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    birthday: row.birthday,
    color: trimToNull(row.color),
    temperament: trimToNull(row.temperament),
    description: trimToNull(row.description),
    price: row.price,
    priceComment: trimToNull(row.price_comment),
    photos,
    breeder,
  };
}

export function mapPetEditRowToInput(row: PetEditRow): CreatePetDraftInput {
  return {
    managementName: row.management_name,
    publicDisplayName: row.public_display_name,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    birthday: row.birthday ?? "",
    color: row.color ?? "",
    temperament: row.temperament ?? "",
    price: row.price != null ? String(row.price) : "",
    priceComment: row.price_comment ?? "",
  };
}

export type PetSpecies = "dog" | "cat";
export type PetSex = "male" | "female";
export type PetStatus =
  | "draft"
  | "under_review"
  | "published"
  | "paused"
  | "family_decided"
  | "closed";

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
  | { success: true; pets: BreederPetListItem[] }
  | { success: false; error: string };

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
  | { success: true; photoId: string }
  | { success: false; error: string };

export type PetPhotoActionResult = { success: true } | { success: false; error: string };

export type SubmitPetForReviewResult =
  | { success: true }
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
  | { success: true }
  | { success: false; fieldErrors?: CreatePetDraftFieldErrors; error?: string };

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

export function mapPetPhotoRowToListItem(
  row: PetPhotoRow,
  signedUrl: string,
): PetPhotoListItem {
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

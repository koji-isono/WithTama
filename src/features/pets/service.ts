"use server";

import { createClient } from "@/lib/supabase/server";

import { formatPetPhotoUploadError } from "./format-pet-photo-error";
import { formatPetSaveError } from "./format-save-error";
import { buildPetEditPageData } from "./loaders";
import { PET_PHOTO_FORM_FIELD } from "./photo-constants";
import { buildPetPhotoAltText } from "./photo-validation";
import { buildPetPhotoStoragePath } from "./photo-utils";
import {
  countPetPhotosForBreeder,
  createPet,
  createPetPhoto,
  deletePetPhoto,
  getPetByIdForBreeder,
  listPetsWithMainPhotoByBreederUserId,
  removePetPhotoFromStorage,
  setMainPetPhoto,
  submitPetForReview,
  updatePetDraft,
  uploadPetPhotoToStorage,
} from "./repository";
import type {
  CreatePetDraftInput,
  CreatePetDraftResult,
  LoadBreederPetsResult,
  PetEditPageData,
  PetPhotoActionResult,
  SubmitPetForReviewResult,
  UpdatePetDraftResult,
  UploadPetPhotoResult,
} from "./types";
import { mapPetListWithMainPhotoToBreederPetListItem } from "./types";
import {
  hasPetValidationErrors,
  normalizeCreatePetDraftInput,
  PET_REVIEW_SUBMIT_GENERIC_ERROR_MESSAGE,
  PET_REVIEW_SUBMIT_PHOTO_REQUIRED_MESSAGE,
  PET_REVIEW_SUBMIT_STATUS_INVALID_MESSAGE,
  validateCreatePetDraftInput,
  validatePetForReviewSubmit,
  validatePetPhotoUpload,
} from "./validation";

export async function loadBreederPets(): Promise<LoadBreederPetsResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    const rows = await listPetsWithMainPhotoByBreederUserId(user.id);

    return {
      success: true,
      pets: rows.map(mapPetListWithMainPhotoToBreederPetListItem),
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("loadBreederPets failed", error);
    }

    return {
      success: false,
      error: "犬猫一覧の取得に失敗しました。",
    };
  }
}

export async function createPetDraft(input: CreatePetDraftInput): Promise<CreatePetDraftResult> {
  const fieldErrors = validateCreatePetDraftInput(input);

  if (hasPetValidationErrors(fieldErrors)) {
    return { success: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    const normalized = normalizeCreatePetDraftInput(input);

    const { id } = await createPet(user.id, {
      management_name: normalized.managementName,
      public_display_name: normalized.publicDisplayName,
      species: normalized.species,
      breed: normalized.breed,
      sex: normalized.sex,
      birthday: normalized.birthday,
      color: normalized.color,
      temperament: normalized.temperament,
      price: normalized.price,
      price_comment: normalized.priceComment,
      status: "draft",
      display_order: 0,
      created_by: user.id,
      updated_by: user.id,
    });

    return { success: true, petId: id };
  } catch (error) {
    return {
      success: false,
      error: formatPetSaveError(error),
    };
  }
}

export async function getPetEditData(petId: string): Promise<PetEditPageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return buildPetEditPageData(user.id, petId);
}

export async function updatePetDraftAction(
  petId: string,
  input: CreatePetDraftInput,
): Promise<UpdatePetDraftResult> {
  const fieldErrors = validateCreatePetDraftInput(input);

  if (hasPetValidationErrors(fieldErrors)) {
    return { success: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    const normalized = normalizeCreatePetDraftInput(input);

    await updatePetDraft(user.id, petId, {
      management_name: normalized.managementName,
      public_display_name: normalized.publicDisplayName,
      species: normalized.species,
      breed: normalized.breed,
      sex: normalized.sex,
      birthday: normalized.birthday,
      color: normalized.color,
      temperament: normalized.temperament,
      price: normalized.price,
      price_comment: normalized.priceComment,
      updated_by: user.id,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatPetSaveError(error),
    };
  }
}

export async function uploadPetPhotoAction(
  petId: string,
  formData: FormData,
): Promise<UploadPetPhotoResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  const fileValue = formData.get(PET_PHOTO_FORM_FIELD);
  const file = fileValue instanceof File ? fileValue : null;

  try {
    const pet = await getPetByIdForBreeder(user.id, petId);

    if (!pet) {
      return { success: false, error: "犬猫が見つかりません。" };
    }

    const currentCount = await countPetPhotosForBreeder(user.id, petId);
    const validationError = validatePetPhotoUpload(file, currentCount);

    if (validationError) {
      return { success: false, error: validationError };
    }

    const storagePath = buildPetPhotoStoragePath(user.id, petId, file!);

    await uploadPetPhotoToStorage(user.id, petId, file!, storagePath);

    try {
      const { id } = await createPetPhoto(user.id, petId, {
        storage_path: storagePath,
        display_order: currentCount,
        is_main: currentCount === 0,
        alt_text: buildPetPhotoAltText(pet.public_display_name),
      });

      return { success: true, photoId: id };
    } catch (dbError) {
      try {
        await removePetPhotoFromStorage(storagePath);
      } catch (cleanupError) {
        console.error("Pet photo storage cleanup failed after DB insert error", {
          petId,
          storagePath,
          dbError,
          cleanupError,
        });
      }

      throw dbError;
    }
  } catch (error) {
    return {
      success: false,
      error: formatPetPhotoUploadError(error),
    };
  }
}

export async function setMainPetPhotoAction(
  petId: string,
  photoId: string,
): Promise<PetPhotoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    await setMainPetPhoto(user.id, petId, photoId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "メイン写真の設定に失敗しました。",
    };
  }
}

export async function deletePetPhotoAction(
  petId: string,
  photoId: string,
): Promise<PetPhotoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    await deletePetPhoto(user.id, petId, photoId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "写真の削除に失敗しました。",
    };
  }
}

export async function submitPetForReviewAction(
  petId: string,
): Promise<SubmitPetForReviewResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "ログインが必要です。" };
  }

  try {
    const pet = await getPetByIdForBreeder(user.id, petId);

    if (!pet) {
      return { success: false, error: PET_REVIEW_SUBMIT_GENERIC_ERROR_MESSAGE };
    }

    if (pet.status !== "draft") {
      return { success: false, error: PET_REVIEW_SUBMIT_STATUS_INVALID_MESSAGE };
    }

    const validationError = validatePetForReviewSubmit(pet);

    if (validationError) {
      return { success: false, error: validationError };
    }

    const photoCount = await countPetPhotosForBreeder(user.id, petId);

    if (photoCount < 1) {
      return { success: false, error: PET_REVIEW_SUBMIT_PHOTO_REQUIRED_MESSAGE };
    }

    const updated = await submitPetForReview(user.id, petId, user.id);

    if (!updated) {
      return { success: false, error: PET_REVIEW_SUBMIT_STATUS_INVALID_MESSAGE };
    }

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("submitPetForReviewAction failed", error);
    }

    return { success: false, error: PET_REVIEW_SUBMIT_GENERIC_ERROR_MESSAGE };
  }
}

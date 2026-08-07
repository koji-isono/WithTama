import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
  formatPetPhotoDeleteError,
  logPetPhotoOperationFailure,
} from "./format-pet-photo-error";
import { PET_PHOTOS_BUCKET, PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS } from "./photo-constants";
import { isValidPetPhotoStoragePath } from "./photo-utils";
import type {
  InsertPetData,
  InsertPetPhotoData,
  PetEditRow,
  PetListWithMainPhotoRow,
  PetPhotoRow,
  PetRow,
  UpdatePetDraftData,
} from "./types";

const petListSelect =
  "id, breeder_id, management_name, public_display_name, species, breed, sex, birthday, status, display_order, created_at";

const petListWithMainPhotoSelect =
  "id, management_name, public_display_name, species, breed, sex, birthday, price, status, updated_at";

const petEditSelect =
  "id, breeder_id, management_name, public_display_name, species, breed, sex, birthday, color, temperament, price, price_comment, status";

export async function getBreederIdByUserId(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const breederId = data?.id ?? null;

  if (process.env.NODE_ENV === "development") {
    console.log({
      userId,
      breederId,
    });
  }

  return breederId;
}

export async function listPetsByBreederUserId(userId: string): Promise<PetRow[]> {
  const breederId = await getBreederIdByUserId(userId);

  if (!breederId) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pets")
    .select(petListSelect)
    .eq("breeder_id", breederId)
    .is("deleted_at", null)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PetRow[];
}

export async function listPetsWithMainPhotoByBreederUserId(
  userId: string,
): Promise<PetListWithMainPhotoRow[]> {
  const breederId = await getBreederIdByUserId(userId);

  if (!breederId) {
    return [];
  }

  const supabase = await createClient();

  const { data: pets, error: petsError } = await supabase
    .from("pets")
    .select(petListWithMainPhotoSelect)
    .eq("breeder_id", breederId)
    .is("deleted_at", null)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (petsError) {
    throw petsError;
  }

  const petRows = pets ?? [];

  if (petRows.length === 0) {
    return [];
  }

  const petIds = petRows.map((pet) => pet.id as string);

  const { data: mainPhotos, error: photosError } = await supabase
    .from("pet_photos")
    .select("pet_id, storage_path")
    .in("pet_id", petIds)
    .eq("is_main", true);

  if (photosError) {
    throw photosError;
  }

  const mainPhotoPathByPetId = new Map<string, string>();

  for (const photo of mainPhotos ?? []) {
    mainPhotoPathByPetId.set(photo.pet_id as string, photo.storage_path as string);
  }

  const storagePaths = [...new Set(mainPhotoPathByPetId.values())];
  const signedUrlByPath = new Map<string, string>();

  if (storagePaths.length > 0) {
    const { data: signedUrls, error: signedUrlError } = await supabase.storage
      .from(PET_PHOTOS_BUCKET)
      .createSignedUrls(storagePaths, PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS);

    if (signedUrlError) {
      throw signedUrlError;
    }

    for (const item of signedUrls ?? []) {
      if (item.path && item.signedUrl) {
        signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  return petRows.map((pet) => {
    const petId = pet.id as string;
    const storagePath = mainPhotoPathByPetId.get(petId) ?? null;

    return {
      id: petId,
      management_name: pet.management_name as string,
      public_display_name: (pet.public_display_name as string | null) ?? null,
      species: pet.species as PetListWithMainPhotoRow["species"],
      breed: pet.breed as string,
      sex: pet.sex as PetListWithMainPhotoRow["sex"],
      birthday: (pet.birthday as string | null) ?? null,
      price: (pet.price as number | null) ?? null,
      status: pet.status as PetListWithMainPhotoRow["status"],
      updated_at: pet.updated_at as string,
      main_photo_signed_url: storagePath ? (signedUrlByPath.get(storagePath) ?? null) : null,
    };
  });
}

export async function listPetsForCurrentBreeder(): Promise<PetRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("ログインが必要です。");
  }

  return listPetsByBreederUserId(user.id);
}

export async function createPet(userId: string, data: InsertPetData): Promise<{ id: string }> {
  const breederId = await getBreederIdByUserId(userId);

  if (!breederId) {
    throw new Error("ブリーダー情報が見つかりません。");
  }

  const petData = {
    breeder_id: breederId,
    management_name: data.management_name,
    public_display_name: data.public_display_name,
    species: data.species,
    breed: data.breed,
    sex: data.sex,
    birthday: data.birthday,
    color: data.color,
    temperament: data.temperament,
    price: data.price,
    price_comment: data.price_comment,
    status: "draft" as const,
    display_order: 0,
    created_by: data.created_by,
    updated_by: data.updated_by,
  };

  if (process.env.NODE_ENV === "development") {
    console.log({
      breederId,
      petData,
    });
  }

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("pets")
    .insert(petData)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return { id: row.id as string };
}

export async function getPetByIdForBreeder(
  userId: string,
  petId: string,
): Promise<PetEditRow | null> {
  const breederId = await getBreederIdByUserId(userId);

  if (!breederId) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pets")
    .select(petEditSelect)
    .eq("id", petId)
    .eq("breeder_id", breederId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PetEditRow | null;
}

export async function submitPetForReview(
  userId: string,
  petId: string,
  updatedBy: string,
): Promise<boolean> {
  const breederId = await getBreederIdByUserId(userId);

  if (!breederId) {
    throw new Error("ブリーダー情報が見つかりません。");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pets")
    .update({
      status: "under_review",
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", petId)
    .eq("breeder_id", breederId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data != null;
}

export async function updatePetDraft(
  userId: string,
  petId: string,
  data: UpdatePetDraftData,
): Promise<void> {
  const existing = await getPetByIdForBreeder(userId, petId);

  if (!existing) {
    throw new Error("犬猫が見つかりません。");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("pets")
    .update({
      management_name: data.management_name,
      public_display_name: data.public_display_name,
      species: data.species,
      breed: data.breed,
      sex: data.sex,
      birthday: data.birthday,
      color: data.color,
      temperament: data.temperament,
      price: data.price,
      price_comment: data.price_comment,
      updated_by: data.updated_by,
      updated_at: new Date().toISOString(),
    })
    .eq("id", petId)
    .eq("breeder_id", existing.breeder_id);

  if (error) {
    throw error;
  }
}

const petPhotoSelect =
  "id, pet_id, storage_path, display_order, is_main, alt_text, created_at, updated_at";

export async function getPetPhotosForBreeder(
  userId: string,
  petId: string,
): Promise<PetPhotoRow[]> {
  const existing = await getPetByIdForBreeder(userId, petId);

  if (!existing) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pet_photos")
    .select(petPhotoSelect)
    .eq("pet_id", petId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PetPhotoRow[];
}

export async function countPetPhotosForBreeder(userId: string, petId: string): Promise<number> {
  const existing = await getPetByIdForBreeder(userId, petId);

  if (!existing) {
    return 0;
  }

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("pet_photos")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getPetPhotoByIdForBreeder(
  userId: string,
  petId: string,
  photoId: string,
): Promise<PetPhotoRow | null> {
  const existing = await getPetByIdForBreeder(userId, petId);

  if (!existing) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pet_photos")
    .select(petPhotoSelect)
    .eq("id", photoId)
    .eq("pet_id", petId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PetPhotoRow | null;
}

export async function uploadPetPhotoToStorage(
  userId: string,
  petId: string,
  file: File,
  storagePath: string,
): Promise<string> {
  const existing = await getPetByIdForBreeder(userId, petId);

  if (!existing) {
    throw new Error("犬猫が見つかりません。");
  }

  if (!isValidPetPhotoStoragePath(userId, petId, storagePath)) {
    throw new Error(`Invalid pet photo storage path: ${storagePath}`);
  }

  const supabase = await createClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from(PET_PHOTOS_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    logPetPhotoOperationFailure(error, {
      operation: "upload",
      petId,
      storagePath,
      bucket: PET_PHOTOS_BUCKET,
      fileType: file.type,
      fileSize: file.size,
    });
    throw error;
  }

  return storagePath;
}

export async function createPetPhoto(
  userId: string,
  petId: string,
  data: InsertPetPhotoData,
): Promise<{ id: string }> {
  const existing = await getPetByIdForBreeder(userId, petId);

  if (!existing) {
    throw new Error("犬猫が見つかりません。");
  }

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("pet_photos")
    .insert({
      pet_id: petId,
      storage_path: data.storage_path,
      display_order: data.display_order,
      is_main: data.is_main,
      alt_text: data.alt_text,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return { id: row.id as string };
}

export async function setMainPetPhoto(
  userId: string,
  petId: string,
  photoId: string,
): Promise<void> {
  const existing = await getPetByIdForBreeder(userId, petId);

  if (!existing) {
    throw new Error("犬猫が見つかりません。");
  }

  const photo = await getPetPhotoByIdForBreeder(userId, petId, photoId);

  if (!photo) {
    throw new Error("写真が見つかりません。");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("set_main_pet_photo", {
    p_pet_id: petId,
    p_photo_id: photoId,
  });

  if (error) {
    logPetPhotoOperationFailure(error, {
      operation: "set_main",
      petId,
      photoId,
      storagePath: photo.storage_path,
    });
    throw error;
  }
}

async function promoteFirstPetPhotoToMain(userId: string, petId: string): Promise<void> {
  const photos = await getPetPhotosForBreeder(userId, petId);

  if (photos.length === 0) {
    return;
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("set_main_pet_photo", {
    p_pet_id: petId,
    p_photo_id: photos[0].id,
  });

  if (error) {
    logPetPhotoOperationFailure(error, {
      operation: "set_main",
      petId,
      photoId: photos[0].id,
      storagePath: photos[0].storage_path,
    });
    throw error;
  }
}

export async function deletePetPhoto(
  userId: string,
  petId: string,
  photoId: string,
): Promise<void> {
  const existing = await getPetByIdForBreeder(userId, petId);

  if (!existing) {
    throw new Error("犬猫が見つかりません。");
  }

  const photo = await getPetPhotoByIdForBreeder(userId, petId, photoId);

  if (!photo) {
    throw new Error("写真が見つかりません。");
  }

  const wasMain = photo.is_main;
  const storagePath = photo.storage_path;
  const supabase = await createClient();

  const { error: storageError } = await supabase.storage
    .from(PET_PHOTOS_BUCKET)
    .remove([storagePath]);

  if (storageError) {
    logPetPhotoOperationFailure(storageError, {
      operation: "delete",
      petId,
      photoId,
      storagePath,
      bucket: PET_PHOTOS_BUCKET,
    });
    throw new Error(formatPetPhotoDeleteError(storageError));
  }

  const { error: dbError } = await supabase
    .from("pet_photos")
    .delete()
    .eq("id", photoId)
    .eq("pet_id", petId);

  if (dbError) {
    logPetPhotoOperationFailure(dbError, {
      operation: "delete",
      petId,
      photoId,
      storagePath,
      bucket: PET_PHOTOS_BUCKET,
    });
    throw new Error(
      "写真レコードの削除に失敗しました。Storage 上のファイルは削除済みです。",
    );
  }

  if (wasMain) {
    await promoteFirstPetPhotoToMain(userId, petId);
  }
}

export async function getPetPhotoSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(PET_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS);

  if (error) {
    logPetPhotoOperationFailure(error, {
      operation: "upload",
      petId: "unknown",
      storagePath,
      bucket: PET_PHOTOS_BUCKET,
    });
    return null;
  }

  return data.signedUrl;
}

export async function removePetPhotoFromStorage(storagePath: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(PET_PHOTOS_BUCKET).remove([storagePath]);

  if (error) {
    logPetPhotoOperationFailure(error, {
      operation: "delete",
      petId: "unknown",
      storagePath,
      bucket: PET_PHOTOS_BUCKET,
    });
    throw error;
  }
}

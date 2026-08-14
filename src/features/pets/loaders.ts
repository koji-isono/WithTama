import "server-only";

import { createClient } from "@/lib/supabase/server";

import { getPetByIdForBreeder, getPetPhotoSignedUrl, getPetPhotosForBreeder } from "./repository";
import { listPublishedPetsForPublic, getPublishedPetDetailForPublic } from "./public-repository";
import {
  mapPetEditRowToInput,
  mapPetPhotoRowToListItem,
  type LoadPublicPetsPageResult,
  type LoadPublicPetDetailPageResult,
  type PetEditPageData,
} from "./types";
import { isValidPublicPetId } from "./validation";

async function loadPetPhotosWithSignedUrls(
  userId: string,
  petId: string,
): Promise<PetEditPageData["photos"]> {
  const rows = await getPetPhotosForBreeder(userId, petId);
  const photos: PetEditPageData["photos"] = [];

  for (const row of rows) {
    const signedUrl = await getPetPhotoSignedUrl(row.storage_path);

    if (!signedUrl) {
      continue;
    }

    photos.push(mapPetPhotoRowToListItem(row, signedUrl));
  }

  return photos;
}

export async function buildPetEditPageData(
  userId: string,
  petId: string,
): Promise<PetEditPageData | null> {
  const row = await getPetByIdForBreeder(userId, petId);

  if (!row) {
    return null;
  }

  const photos = await loadPetPhotosWithSignedUrls(userId, petId);

  return {
    petId: row.id,
    status: row.status,
    input: mapPetEditRowToInput(row),
    photos,
  };
}

export async function loadPetEditPageData(petId: string): Promise<PetEditPageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return buildPetEditPageData(user.id, petId);
}

export async function loadPublicPetsPage(): Promise<LoadPublicPetsPageResult> {
  try {
    const pets = await listPublishedPetsForPublic();

    return { success: true, pets };
  } catch (error) {
    const message = error instanceof Error ? error.message : "公開犬猫一覧の取得に失敗しました。";

    return { success: false, error: message };
  }
}

export async function loadPublicPetDetailPage(
  petId: string,
): Promise<LoadPublicPetDetailPageResult> {
  if (!isValidPublicPetId(petId)) {
    return { success: false, notFound: true };
  }

  try {
    const detail = await getPublishedPetDetailForPublic(petId.trim());

    if (!detail) {
      return { success: false, notFound: true };
    }

    return { success: true, detail };
  } catch (error) {
    const message = error instanceof Error ? error.message : "公開犬猫詳細の取得に失敗しました。";

    return { success: false, error: message };
  }
}

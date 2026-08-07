import "server-only";

import { createClient } from "@/lib/supabase/server";

import { getPetByIdForBreeder, getPetPhotoSignedUrl, getPetPhotosForBreeder } from "./repository";
import { mapPetEditRowToInput, mapPetPhotoRowToListItem, type PetEditPageData } from "./types";

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

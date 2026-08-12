import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  PET_PHOTOS_BUCKET,
  PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS,
} from "@/features/pets/photo-constants";

type BreederSummary = {
  business_name: string | null;
  representative_name: string | null;
};

type UnderReviewPetRow = {
  id: string;
  public_display_name: string | null;
  breed: string;
  breeder: BreederSummary | null;
};

function normalizeBreederSummary(
  breeders: BreederSummary | BreederSummary[] | null | undefined,
): BreederSummary | null {
  if (!breeders) {
    return null;
  }

  if (Array.isArray(breeders)) {
    return breeders[0] ?? null;
  }

  return breeders;
}

type SubmittedLogRow = {
  pet_id: string;
  created_at: string;
};

export async function listUnderReviewPetsForAdmin(): Promise<UnderReviewPetRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pets")
    .select(
      `
      id,
      public_display_name,
      breed,
      breeders (
        business_name,
        representative_name
      )
    `,
    )
    .eq("status", "under_review")
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    public_display_name: row.public_display_name as string | null,
    breed: row.breed as string,
    breeder: normalizeBreederSummary(
      row.breeders as BreederSummary | BreederSummary[] | null | undefined,
    ),
  }));
}

export async function getLatestSubmittedAtByPetIds(petIds: string[]): Promise<Map<string, string>> {
  if (petIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pet_review_logs")
    .select("pet_id, created_at")
    .in("pet_id", petIds)
    .eq("action", "submitted")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const latestByPetId = new Map<string, string>();

  for (const row of (data ?? []) as SubmittedLogRow[]) {
    if (!latestByPetId.has(row.pet_id)) {
      latestByPetId.set(row.pet_id, row.created_at);
    }
  }

  return latestByPetId;
}

export async function getMainPhotoSignedUrlByPetIds(
  petIds: string[],
): Promise<Map<string, string>> {
  if (petIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

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

  const signedUrlByPetId = new Map<string, string>();

  for (const [petId, storagePath] of mainPhotoPathByPetId) {
    const signedUrl = signedUrlByPath.get(storagePath);

    if (signedUrl) {
      signedUrlByPetId.set(petId, signedUrl);
    }
  }

  return signedUrlByPetId;
}

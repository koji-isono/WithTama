import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  PET_PHOTOS_BUCKET,
  PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS,
} from "@/features/pets/photo-constants";
import type { PetSex, PetSpecies, PetStatus } from "@/features/pets/types";

import type { PetReviewLogAction } from "./constants";

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

type AdminBreederDetailRow = {
  business_name: string | null;
  representative_name: string | null;
  prefecture: string | null;
  city: string | null;
  public_email: string | null;
  profile_text: string | null;
  breeding_policy: string | null;
  health_policy: string | null;
  breeding_environment: string | null;
  business_registration_type: string | null;
  business_registration_number: string | null;
  registration_authority: string | null;
  registration_expires_at: string | null;
  review_status: string;
  identity_verification_status: string;
  business_verification_status: string;
};

type UnderReviewPetDetailRow = {
  id: string;
  management_name: string;
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
  status: PetStatus;
  breeders: AdminBreederDetailRow | null;
};

type PetPhotoRow = {
  id: string;
  storage_path: string;
  display_order: number;
  is_main: boolean;
  alt_text: string | null;
};

type PetReviewLogRow = {
  id: string;
  created_at: string;
  action: PetReviewLogAction;
  comment: string | null;
  actor_user_id: string;
};

function normalizeBreederDetail(
  breeders: AdminBreederDetailRow | AdminBreederDetailRow[] | null | undefined,
): AdminBreederDetailRow | null {
  if (!breeders) {
    return null;
  }

  if (Array.isArray(breeders)) {
    return breeders[0] ?? null;
  }

  return breeders;
}

async function createSignedUrlByStoragePaths(storagePaths: string[]): Promise<Map<string, string>> {
  if (storagePaths.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const uniquePaths = [...new Set(storagePaths)];
  const signedUrlByPath = new Map<string, string>();

  const { data: signedUrls, error: signedUrlError } = await supabase.storage
    .from(PET_PHOTOS_BUCKET)
    .createSignedUrls(uniquePaths, PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS);

  if (signedUrlError) {
    throw signedUrlError;
  }

  for (const item of signedUrls ?? []) {
    if (item.path && item.signedUrl) {
      signedUrlByPath.set(item.path, item.signedUrl);
    }
  }

  return signedUrlByPath;
}

export async function getUnderReviewPetDetailForAdmin(
  petId: string,
): Promise<UnderReviewPetDetailRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pets")
    .select(
      `
      id,
      management_name,
      public_display_name,
      species,
      breed,
      sex,
      birthday,
      color,
      temperament,
      description,
      price,
      price_comment,
      status,
      breeders (
        business_name,
        representative_name,
        prefecture,
        city,
        public_email,
        profile_text,
        breeding_policy,
        health_policy,
        breeding_environment,
        business_registration_type,
        business_registration_number,
        registration_authority,
        registration_expires_at,
        review_status,
        identity_verification_status,
        business_verification_status
      )
    `,
    )
    .eq("id", petId)
    .eq("status", "under_review")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...(data as Omit<UnderReviewPetDetailRow, "breeders">),
    breeders: normalizeBreederDetail(
      data.breeders as AdminBreederDetailRow | AdminBreederDetailRow[] | null | undefined,
    ),
  };
}

export async function listPetPhotosForAdmin(petId: string): Promise<PetPhotoRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pet_photos")
    .select("id, storage_path, display_order, is_main, alt_text")
    .eq("pet_id", petId)
    .order("display_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PetPhotoRow[];
}

export async function getPetPhotoSignedUrlsForAdmin(
  storagePaths: string[],
): Promise<Map<string, string>> {
  return createSignedUrlByStoragePaths(storagePaths);
}

export async function listPetReviewLogsForAdmin(petId: string): Promise<PetReviewLogRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pet_review_logs")
    .select("id, created_at, action, comment, actor_user_id")
    .eq("pet_id", petId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as PetReviewLogRow[];
}

export async function approvePetForPublishViaRpc(petId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("approve_pet_for_publish", {
    p_pet_id: petId,
  });

  if (error) {
    throw error;
  }
}

export async function returnPetReviewViaRpc(petId: string, comment: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("return_pet_review", {
    p_pet_id: petId,
    p_comment: comment,
  });

  if (error) {
    throw error;
  }
}

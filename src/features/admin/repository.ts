import "server-only";

import { createClient } from "@/lib/supabase/server";
import { BREEDER_DOCUMENTS_BUCKET } from "@/features/breeder-profile/document-constants";
import {
  PET_PHOTOS_BUCKET,
  PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS,
} from "@/features/pets/photo-constants";
import type { PetSex, PetSpecies, PetStatus } from "@/features/pets/types";

import type { PetReviewLogAction } from "./constants";
import {
  BREEDER_DOCUMENT_SIGNED_URL_EXPIRES_SECONDS,
  BREEDER_REVIEW_DETAIL_VIEWABLE_STATUSES,
} from "./constants";

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

type BreederSubmittedLogRow = {
  breeder_id: string;
  created_at: string;
};

type PendingBreederReviewRow = {
  id: string;
  business_name: string | null;
  representative_name: string | null;
  prefecture: string | null;
  review_status: string;
  identity_verification_status: string;
  business_verification_status: string;
  registration_expires_at: string | null;
};

export async function listPendingBreederReviewsForAdmin(): Promise<PendingBreederReviewRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(
      `
      id,
      business_name,
      representative_name,
      prefecture,
      review_status,
      identity_verification_status,
      business_verification_status,
      registration_expires_at
    `,
    )
    .in("review_status", ["submitted", "under_review", "resubmission_required"])
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return (data ?? []) as PendingBreederReviewRow[];
}

export async function getLatestSubmittedAtByBreederIds(
  breederIds: string[],
): Promise<Map<string, string>> {
  if (breederIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeder_review_logs")
    .select("breeder_id, created_at")
    .in("breeder_id", breederIds)
    .eq("action", "submitted")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const latestByBreederId = new Map<string, string>();

  for (const row of (data ?? []) as BreederSubmittedLogRow[]) {
    if (!latestByBreederId.has(row.breeder_id)) {
      latestByBreederId.set(row.breeder_id, row.created_at);
    }
  }

  return latestByBreederId;
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

type BreederReviewDetailRow = {
  id: string;
  business_name: string | null;
  representative_name: string | null;
  phone: string | null;
  public_email: string | null;
  website_url: string | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address_line: string | null;
  business_registration_type: string | null;
  business_registration_number: string | null;
  registration_authority: string | null;
  registration_expires_at: string | null;
  profile_text: string | null;
  breeding_policy: string | null;
  health_policy: string | null;
  breeding_environment: string | null;
  identity_verification_status: string;
  business_verification_status: string;
  identity_document_path: string | null;
  business_license_path: string | null;
  review_status: string;
  membership_status: string;
  approved_at: string | null;
  subscription_status: string | null;
};

type BreederReviewLogRow = {
  id: string;
  created_at: string;
  action: string;
  comment: string | null;
};

function isBreederReviewDetailViewable(reviewStatus: string): boolean {
  return (BREEDER_REVIEW_DETAIL_VIEWABLE_STATUSES as readonly string[]).includes(reviewStatus);
}

export async function getBreederReviewDetailForAdmin(
  breederId: string,
): Promise<BreederReviewDetailRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(
      `
      id,
      business_name,
      representative_name,
      phone,
      public_email,
      website_url,
      postal_code,
      prefecture,
      city,
      address_line,
      business_registration_type,
      business_registration_number,
      registration_authority,
      registration_expires_at,
      profile_text,
      breeding_policy,
      health_policy,
      breeding_environment,
      identity_verification_status,
      business_verification_status,
      identity_document_path,
      business_license_path,
      review_status,
      membership_status,
      approved_at,
      subscription_status
    `,
    )
    .eq("id", breederId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as BreederReviewDetailRow;

  if (!isBreederReviewDetailViewable(row.review_status)) {
    return null;
  }

  return row;
}

export async function listBreederReviewLogsForAdmin(
  breederId: string,
): Promise<BreederReviewLogRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeder_review_logs")
    .select("id, created_at, action, comment")
    .eq("breeder_id", breederId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as BreederReviewLogRow[];
}

export async function createBreederDocumentSignedUrlForAdmin(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BREEDER_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, BREEDER_DOCUMENT_SIGNED_URL_EXPIRES_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function startBreederReviewViaRpc(breederId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("start_breeder_review", {
    p_breeder_id: breederId,
  });

  if (error) {
    throw error;
  }
}

export async function approveBreederReviewViaRpc(breederId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("approve_breeder_review", {
    p_breeder_id: breederId,
  });

  if (error) {
    throw error;
  }
}

export async function returnBreederReviewViaRpc(breederId: string, comment: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("return_breeder_review", {
    p_breeder_id: breederId,
    p_comment: comment,
  });

  if (error) {
    throw error;
  }
}

export async function rejectBreederReviewViaRpc(breederId: string, comment: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("reject_breeder_review", {
    p_breeder_id: breederId,
    p_comment: comment,
  });

  if (error) {
    throw error;
  }
}

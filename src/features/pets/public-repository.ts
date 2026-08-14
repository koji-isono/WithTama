import "server-only";

import { createClient } from "@/lib/supabase/server";

import { PET_PHOTOS_BUCKET, PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS } from "./photo-constants";
import {
  mapBreederPublicDetailProfileRow,
  mapPublishedPetDetailPublicRow,
  mapPublishedPetPublicRowToListItem,
  type BreederPublicDetailProfileRow,
  type BreederPublicProfileRow,
  type PublicBreederDetail,
  type PublicPetDetail,
  type PublicPetDetailPhoto,
  type PublicPetListItem,
  type PublishedPetDetailPublicRow,
  type PublishedPetPublicRow,
} from "./types";
import { formatPublicPetPhotoAlt } from "./list-format";

const publishedPetPublicSelect =
  "id, public_display_name, species, breed, sex, birthday, price, breeder_id";

const publishedPetDetailPublicSelect =
  "id, public_display_name, species, breed, sex, birthday, color, temperament, description, price, price_comment, breeder_id";

const breederPublicProfileSelect = "id, business_name, prefecture";

const breederPublicDetailProfileSelect =
  "id, business_name, prefecture, city, profile_text, breeding_policy, health_policy, breeding_environment";

type PetPhotoPublicRow = {
  id: string;
  storage_path: string;
  is_main: boolean;
  display_order: number;
  created_at: string;
};

function comparePublicPetPhotos(a: PetPhotoPublicRow, b: PetPhotoPublicRow): number {
  if (a.is_main !== b.is_main) {
    return a.is_main ? -1 : 1;
  }

  if (a.display_order !== b.display_order) {
    return a.display_order - b.display_order;
  }

  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

async function createSignedUrlMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePaths: string[],
): Promise<Map<string, string>> {
  const signedUrlByPath = new Map<string, string>();

  if (storagePaths.length === 0) {
    return signedUrlByPath;
  }

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

  return signedUrlByPath;
}

export async function listPublishedPetsForPublic(): Promise<PublicPetListItem[]> {
  const supabase = await createClient();

  const { data: petRows, error: petsError } = await supabase
    .from("published_pets_public")
    .select(publishedPetPublicSelect)
    .order("public_display_name", { ascending: true });

  if (petsError) {
    throw petsError;
  }

  const pets = (petRows ?? []) as PublishedPetPublicRow[];

  if (pets.length === 0) {
    return [];
  }

  const breederIds = [...new Set(pets.map((pet) => pet.breeder_id))];
  const petIds = pets.map((pet) => pet.id);

  const [{ data: breederRows, error: breedersError }, { data: mainPhotos, error: photosError }] =
    await Promise.all([
      supabase
        .from("breeder_public_profiles")
        .select(breederPublicProfileSelect)
        .in("id", breederIds),
      supabase
        .from("pet_photos")
        .select("pet_id, storage_path")
        .in("pet_id", petIds)
        .eq("is_main", true),
    ]);

  if (breedersError) {
    throw breedersError;
  }

  if (photosError) {
    throw photosError;
  }

  const breederById = new Map<string, BreederPublicProfileRow>();

  for (const breeder of (breederRows ?? []) as BreederPublicProfileRow[]) {
    breederById.set(breeder.id, breeder);
  }

  const mainPhotoPathByPetId = new Map<string, string>();

  for (const photo of mainPhotos ?? []) {
    mainPhotoPathByPetId.set(photo.pet_id as string, photo.storage_path as string);
  }

  const storagePaths = [...new Set(mainPhotoPathByPetId.values())];
  const signedUrlByPath = await createSignedUrlMap(supabase, storagePaths);

  return pets.map((pet) => {
    const storagePath = mainPhotoPathByPetId.get(pet.id) ?? null;

    return mapPublishedPetPublicRowToListItem(
      pet,
      breederById.get(pet.breeder_id) ?? null,
      storagePath ? (signedUrlByPath.get(storagePath) ?? null) : null,
    );
  });
}

export async function getPublishedPetDetailForPublic(
  petId: string,
): Promise<PublicPetDetail | null> {
  const supabase = await createClient();

  const { data: petRow, error: petError } = await supabase
    .from("published_pet_detail_public")
    .select(publishedPetDetailPublicSelect)
    .eq("id", petId)
    .maybeSingle();

  if (petError) {
    throw petError;
  }

  if (!petRow) {
    return null;
  }

  const pet = petRow as PublishedPetDetailPublicRow;
  const breederId = pet.breeder_id;

  const [{ data: breederRow, error: breederError }, { data: photoRows, error: photosError }] =
    await Promise.all([
      supabase
        .from("breeder_public_detail_profiles")
        .select(breederPublicDetailProfileSelect)
        .eq("id", breederId)
        .maybeSingle(),
      supabase
        .from("pet_photos")
        .select("id, storage_path, is_main, display_order, created_at")
        .eq("pet_id", petId),
    ]);

  if (breederError) {
    throw breederError;
  }

  if (photosError) {
    throw photosError;
  }

  const sortedPhotos = [...((photoRows ?? []) as PetPhotoPublicRow[])].sort(comparePublicPetPhotos);
  const storagePaths = sortedPhotos.map((photo) => photo.storage_path);
  const signedUrlByPath = await createSignedUrlMap(supabase, storagePaths);

  const publicDisplayName = pet.public_display_name?.trim() || "名称未設定";
  const totalPhotos = sortedPhotos.length;
  const photos: PublicPetDetailPhoto[] = [];

  sortedPhotos.forEach((photo, index) => {
    const signedUrl = signedUrlByPath.get(photo.storage_path);

    if (!signedUrl) {
      return;
    }

    photos.push({
      id: photo.id,
      signedUrl,
      alt: formatPublicPetPhotoAlt(publicDisplayName, index + 1, totalPhotos),
    });
  });

  const breeder: PublicBreederDetail | null = breederRow
    ? mapBreederPublicDetailProfileRow(breederRow as BreederPublicDetailProfileRow)
    : null;

  return mapPublishedPetDetailPublicRow(pet, breeder, photos);
}

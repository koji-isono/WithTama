import "server-only";

import { requireAdmin } from "@/features/auth/admin-auth";

import {
  formatAdminBreederLocation,
  formatAdminDateOnly,
  formatAdminPetBirthday,
  formatAdminPetPrice,
  formatAdminPetReviewSubmittedAt,
  formatAdminPetSex,
  formatAdminPetSpecies,
  formatAdminPetStatus,
  formatAdminReviewLogAction,
  formatAdminReviewStatus,
  formatAdminVerificationStatus,
  formatBreederDisplayName,
} from "./format";
import {
  getLatestSubmittedAtByPetIds,
  getMainPhotoSignedUrlByPetIds,
  getPetPhotoSignedUrlsForAdmin,
  getUnderReviewPetDetailForAdmin,
  listPetPhotosForAdmin,
  listPetReviewLogsForAdmin,
  listUnderReviewPetsForAdmin,
} from "./repository";
import type {
  AdminPetReviewDetailPageData,
  AdminPetReviewListItem,
  AdminPetReviewListPageData,
} from "./types";

function compareSubmittedAtAsc(a: AdminPetReviewListItem, b: AdminPetReviewListItem): number {
  if (a.submittedAt === null && b.submittedAt === null) {
    return a.publicDisplayName?.localeCompare(b.publicDisplayName ?? "") ?? 0;
  }

  if (a.submittedAt === null) {
    return 1;
  }

  if (b.submittedAt === null) {
    return -1;
  }

  const timeCompare = a.submittedAt.localeCompare(b.submittedAt);

  if (timeCompare !== 0) {
    return timeCompare;
  }

  return a.publicDisplayName?.localeCompare(b.publicDisplayName ?? "") ?? 0;
}

export async function loadAdminPetReviewListPageData(): Promise<AdminPetReviewListPageData> {
  await requireAdmin();

  const petRows = await listUnderReviewPetsForAdmin();
  const petIds = petRows.map((pet) => pet.id);

  const [submittedAtByPetId, mainPhotoSignedUrlByPetId] = await Promise.all([
    getLatestSubmittedAtByPetIds(petIds),
    getMainPhotoSignedUrlByPetIds(petIds),
  ]);

  const items: AdminPetReviewListItem[] = petRows.map((pet) => {
    return {
      id: pet.id,
      publicDisplayName: pet.public_display_name,
      breed: pet.breed,
      breederDisplayName: formatBreederDisplayName(
        pet.breeder?.business_name ?? null,
        pet.breeder?.representative_name ?? null,
      ),
      submittedAt: submittedAtByPetId.get(pet.id) ?? null,
      mainPhotoSignedUrl: mainPhotoSignedUrlByPetId.get(pet.id) ?? null,
    };
  });

  items.sort(compareSubmittedAtAsc);

  return { items };
}

export async function loadAdminPetReviewDetailPageData(
  petId: string,
): Promise<AdminPetReviewDetailPageData | null> {
  await requireAdmin();

  const petRow = await getUnderReviewPetDetailForAdmin(petId);

  if (!petRow) {
    return null;
  }

  const [photoRows, reviewLogRows] = await Promise.all([
    listPetPhotosForAdmin(petId),
    listPetReviewLogsForAdmin(petId),
  ]);

  const signedUrlByPath = await getPetPhotoSignedUrlsForAdmin(
    photoRows.map((photo) => photo.storage_path),
  );

  const breederRow = petRow.breeders;

  const pet: AdminPetReviewDetailPageData["pet"] = {
    id: petRow.id,
    managementName: petRow.management_name,
    publicDisplayName: petRow.public_display_name,
    speciesLabel: formatAdminPetSpecies(petRow.species),
    breed: petRow.breed,
    sexLabel: formatAdminPetSex(petRow.sex),
    birthdayLabel: formatAdminPetBirthday(petRow.birthday),
    color: petRow.color,
    temperament: petRow.temperament,
    description: petRow.description,
    priceLabel: formatAdminPetPrice(petRow.price),
    priceComment: petRow.price_comment,
    statusLabel: formatAdminPetStatus(petRow.status),
  };

  const photos: AdminPetReviewDetailPageData["photos"] = photoRows.map((photo) => ({
    id: photo.id,
    signedUrl: signedUrlByPath.get(photo.storage_path) ?? null,
    isMain: photo.is_main,
    altText: photo.alt_text,
    displayOrder: photo.display_order,
  }));

  const breeder: AdminPetReviewDetailPageData["breeder"] = breederRow
    ? {
        displayName: formatBreederDisplayName(
          breederRow.business_name,
          breederRow.representative_name,
        ),
        representativeName: breederRow.representative_name,
        locationLabel: formatAdminBreederLocation(breederRow.prefecture, breederRow.city),
        publicEmail: breederRow.public_email,
        profileText: breederRow.profile_text,
        breedingPolicy: breederRow.breeding_policy,
        healthPolicy: breederRow.health_policy,
        breedingEnvironment: breederRow.breeding_environment,
        businessRegistrationType: breederRow.business_registration_type,
        businessRegistrationNumber: breederRow.business_registration_number,
        registrationAuthority: breederRow.registration_authority,
        registrationExpiresAtLabel: formatAdminDateOnly(breederRow.registration_expires_at),
        reviewStatusLabel: formatAdminReviewStatus(breederRow.review_status),
        identityVerificationStatusLabel: formatAdminVerificationStatus(
          breederRow.identity_verification_status,
        ),
        businessVerificationStatusLabel: formatAdminVerificationStatus(
          breederRow.business_verification_status,
        ),
      }
    : null;

  const reviewLogs: AdminPetReviewDetailPageData["reviewLogs"] = reviewLogRows.map((log) => ({
    id: log.id,
    createdAtLabel: formatAdminPetReviewSubmittedAt(log.created_at),
    action: log.action,
    actionLabel: formatAdminReviewLogAction(log.action),
    comment: log.comment,
    actorUserId: log.actor_user_id,
  }));

  return { pet, photos, breeder, reviewLogs };
}

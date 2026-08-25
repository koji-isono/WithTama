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
  formatAdminBreederReviewStatus,
  formatAdminBreederReviewLogAction,
  formatAdminMembershipStatus,
  formatAdminNullableText,
  formatAdminSubscriptionStatus,
  formatBreederDisplayName,
  getBreederDocumentPreviewKind,
  getRegistrationExpiryWarning,
} from "./format";
import {
  createBreederDocumentSignedUrlForAdmin,
  getBreederReviewDetailForAdmin,
  getLatestSubmittedAtByBreederIds,
  getLatestSubmittedAtByPetIds,
  getMainPhotoSignedUrlByPetIds,
  getPetPhotoSignedUrlsForAdmin,
  getUnderReviewPetDetailForAdmin,
  listPendingBreederReviewsForAdmin,
  listBreederReviewLogsForAdmin,
  listPetPhotosForAdmin,
  listPetReviewLogsForAdmin,
  listUnderReviewPetsForAdmin,
} from "./repository";
import type {
  AdminBreederReviewDetailPageData,
  AdminBreederReviewDocumentPreview,
  AdminBreederReviewListItem,
  AdminBreederReviewListPageData,
  AdminPetReviewDetailPageData,
  AdminPetReviewListItem,
  AdminPetReviewListPageData,
} from "./types";
import {
  ADMIN_BREEDER_DOCUMENT_MISSING_MESSAGE,
  ADMIN_BREEDER_DOCUMENT_UNAVAILABLE_MESSAGE,
  ADMIN_BREEDER_REVIEW_SUBMITTED_AT_UNKNOWN_LABEL,
} from "./constants";

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

function compareBreederSubmittedAtAsc(
  a: AdminBreederReviewListItem,
  b: AdminBreederReviewListItem,
): number {
  if (a.submittedAt === null && b.submittedAt === null) {
    return a.displayName.localeCompare(b.displayName);
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

  return a.displayName.localeCompare(b.displayName);
}

export async function loadAdminBreederReviewListPageData(): Promise<AdminBreederReviewListPageData> {
  await requireAdmin();

  const breederRows = await listPendingBreederReviewsForAdmin();
  const breederIds = breederRows.map((breeder) => breeder.id);
  const submittedAtByBreederId = await getLatestSubmittedAtByBreederIds(breederIds);

  const items: AdminBreederReviewListItem[] = breederRows.map((breeder) => {
    const submittedAt = submittedAtByBreederId.get(breeder.id) ?? null;
    const registrationExpiresAt = breeder.registration_expires_at;

    return {
      id: breeder.id,
      displayName: formatBreederDisplayName(breeder.business_name, breeder.representative_name),
      representativeNameLabel: breeder.representative_name?.trim() || "—",
      prefectureLabel: breeder.prefecture?.trim() || "—",
      reviewStatus: breeder.review_status,
      reviewStatusLabel: formatAdminBreederReviewStatus(breeder.review_status),
      identityVerificationStatusLabel: formatAdminVerificationStatus(
        breeder.identity_verification_status,
      ),
      businessVerificationStatusLabel: formatAdminVerificationStatus(
        breeder.business_verification_status,
      ),
      registrationExpiresAt,
      registrationExpiresAtLabel: formatAdminDateOnly(registrationExpiresAt),
      registrationExpiryWarning: getRegistrationExpiryWarning(registrationExpiresAt),
      submittedAt,
      submittedAtLabel: submittedAt
        ? formatAdminPetReviewSubmittedAt(submittedAt)
        : ADMIN_BREEDER_REVIEW_SUBMITTED_AT_UNKNOWN_LABEL,
    };
  });

  items.sort(compareBreederSubmittedAtAsc);

  return { items };
}

async function buildBreederDocumentPreview(
  storagePath: string | null,
  statusLabel: string,
): Promise<AdminBreederReviewDocumentPreview> {
  if (!storagePath?.trim()) {
    return {
      statusLabel,
      signedUrl: null,
      previewKind: null,
      message: ADMIN_BREEDER_DOCUMENT_MISSING_MESSAGE,
    };
  }

  const previewKind = getBreederDocumentPreviewKind(storagePath);
  const signedUrl = await createBreederDocumentSignedUrlForAdmin(storagePath);

  if (!signedUrl) {
    return {
      statusLabel,
      signedUrl: null,
      previewKind,
      message: ADMIN_BREEDER_DOCUMENT_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    statusLabel,
    signedUrl,
    previewKind,
    message: null,
  };
}

export async function loadAdminBreederReviewDetailPageData(
  breederId: string,
): Promise<AdminBreederReviewDetailPageData | null> {
  await requireAdmin();

  const breederRow = await getBreederReviewDetailForAdmin(breederId);

  if (!breederRow) {
    return null;
  }

  let reviewLogRows: Awaited<ReturnType<typeof listBreederReviewLogsForAdmin>> = [];

  try {
    reviewLogRows = await listBreederReviewLogsForAdmin(breederId);
  } catch (error) {
    console.error("[loadAdminBreederReviewDetailPageData] review logs fetch failed", error);
  }

  const [identityDocument, businessLicense] = await Promise.all([
    buildBreederDocumentPreview(
      breederRow.identity_document_path,
      formatAdminVerificationStatus(breederRow.identity_verification_status),
    ),
    buildBreederDocumentPreview(
      breederRow.business_license_path,
      formatAdminVerificationStatus(breederRow.business_verification_status),
    ),
  ]);

  const registrationExpiresAt = breederRow.registration_expires_at;

  return {
    id: breederRow.id,
    reviewStatus: breederRow.review_status,
    displayName: formatBreederDisplayName(breederRow.business_name, breederRow.representative_name),
    businessNameLabel: formatAdminNullableText(breederRow.business_name),
    representativeNameLabel: formatAdminNullableText(breederRow.representative_name),
    phoneLabel: formatAdminNullableText(breederRow.phone),
    publicEmailLabel: formatAdminNullableText(breederRow.public_email),
    websiteUrl: breederRow.website_url?.trim() || null,
    websiteUrlLabel: formatAdminNullableText(breederRow.website_url),
    postalCodeLabel: formatAdminNullableText(breederRow.postal_code),
    prefectureLabel: formatAdminNullableText(breederRow.prefecture),
    cityLabel: formatAdminNullableText(breederRow.city),
    addressLineLabel: formatAdminNullableText(breederRow.address_line),
    businessRegistrationTypeLabel: formatAdminNullableText(breederRow.business_registration_type),
    businessRegistrationNumberLabel: formatAdminNullableText(
      breederRow.business_registration_number,
    ),
    registrationAuthorityLabel: formatAdminNullableText(breederRow.registration_authority),
    registrationExpiresAtLabel: formatAdminDateOnly(registrationExpiresAt),
    registrationExpiryWarning: getRegistrationExpiryWarning(registrationExpiresAt),
    profileTextLabel: formatAdminNullableText(breederRow.profile_text),
    breedingPolicyLabel: formatAdminNullableText(breederRow.breeding_policy),
    healthPolicyLabel: formatAdminNullableText(breederRow.health_policy),
    breedingEnvironmentLabel: formatAdminNullableText(breederRow.breeding_environment),
    reviewStatusLabel: formatAdminBreederReviewStatus(breederRow.review_status),
    identityVerificationStatusLabel: formatAdminVerificationStatus(
      breederRow.identity_verification_status,
    ),
    businessVerificationStatusLabel: formatAdminVerificationStatus(
      breederRow.business_verification_status,
    ),
    membershipStatusLabel: formatAdminMembershipStatus(breederRow.membership_status),
    approvedAtLabel: breederRow.approved_at
      ? formatAdminPetReviewSubmittedAt(breederRow.approved_at)
      : "—",
    subscriptionStatusLabel: formatAdminSubscriptionStatus(breederRow.subscription_status),
    identityDocument,
    businessLicense,
    reviewLogs: reviewLogRows.map((log) => ({
      id: log.id,
      createdAtLabel: formatAdminPetReviewSubmittedAt(log.created_at),
      actionLabel: formatAdminBreederReviewLogAction(log.action),
      comment: log.comment,
    })),
  };
}

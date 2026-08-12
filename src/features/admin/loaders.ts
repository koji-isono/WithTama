import "server-only";

import { requireAdmin } from "@/features/auth/admin-auth";

import { formatBreederDisplayName } from "./format";
import {
  getLatestSubmittedAtByPetIds,
  getMainPhotoSignedUrlByPetIds,
  listUnderReviewPetsForAdmin,
} from "./repository";
import type { AdminPetReviewListItem, AdminPetReviewListPageData } from "./types";

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

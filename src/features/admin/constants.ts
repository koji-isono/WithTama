export const ADMIN_PET_REVIEW_LIST_SCREEN_ID = "AD-10";

export const ADMIN_PET_REVIEWS_PATH = "/admin/pets/reviews";

export const ADMIN_PET_REVIEW_SUBMITTED_AT_UNKNOWN_LABEL = "申請日時不明";

export function getAdminPetReviewDetailPath(petId: string): string {
  return `${ADMIN_PET_REVIEWS_PATH}/${petId}`;
}

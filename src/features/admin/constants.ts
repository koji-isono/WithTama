export const ADMIN_PET_REVIEW_LIST_SCREEN_ID = "AD-10";
export const ADMIN_PET_REVIEW_DETAIL_SCREEN_ID = "AD-11";

export const ADMIN_PET_REVIEWS_PATH = "/admin/pets/reviews";

export const ADMIN_PET_REVIEW_SUBMITTED_AT_UNKNOWN_LABEL = "申請日時不明";

export const ADMIN_PET_REVIEW_GENERIC_ERROR_MESSAGE =
  "処理に失敗しました。時間をおいて再度お試しください。";

export const ADMIN_PET_REVIEW_APPROVE_CONFIRM_MESSAGE =
  "この犬猫情報を承認して公開します。よろしいですか？";

export const ADMIN_PET_REVIEW_RETURN_CONFIRM_MESSAGE =
  "この犬猫情報をブリーダーへ差し戻します。よろしいですか？";

export function getAdminPetReviewDetailPath(petId: string): string {
  return `${ADMIN_PET_REVIEWS_PATH}/${petId}`;
}

export const PET_REVIEW_LOG_ACTIONS = ["submitted", "returned", "approved"] as const;

export type PetReviewLogAction = (typeof PET_REVIEW_LOG_ACTIONS)[number];

export const PET_REVIEW_LOG_ACTION_LABELS: Record<PetReviewLogAction, string> = {
  submitted: "公開申請",
  returned: "差戻し",
  approved: "公開承認",
};

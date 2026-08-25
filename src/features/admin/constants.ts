export const ADMIN_PET_REVIEW_LIST_SCREEN_ID = "AD-10";
export const ADMIN_PET_REVIEW_DETAIL_SCREEN_ID = "AD-11";

export const ADMIN_BREEDER_REVIEW_LIST_SCREEN_ID = "AD-01";
export const ADMIN_BREEDER_REVIEW_DETAIL_SCREEN_ID = "AD-02";

export const ADMIN_PET_REVIEWS_PATH = "/admin/pets/reviews";
export const ADMIN_BREEDER_REVIEWS_PATH = "/admin/breeders/reviews";

export const ADMIN_PET_REVIEW_SUBMITTED_AT_UNKNOWN_LABEL = "申請日時不明";
export const ADMIN_BREEDER_REVIEW_SUBMITTED_AT_UNKNOWN_LABEL = "申請日時不明";
export const ADMIN_BREEDER_REVIEW_EMPTY_MESSAGE = "審査待ちのブリーダー申請はありません";

export const ADMIN_PET_REVIEW_GENERIC_ERROR_MESSAGE =
  "処理に失敗しました。時間をおいて再度お試しください。";

export const ADMIN_PET_REVIEW_APPROVE_CONFIRM_MESSAGE =
  "この犬猫情報を承認して公開します。よろしいですか？";

export const ADMIN_PET_REVIEW_RETURN_CONFIRM_MESSAGE =
  "この犬猫情報をブリーダーへ差し戻します。よろしいですか？";

export function getAdminPetReviewDetailPath(petId: string): string {
  return `${ADMIN_PET_REVIEWS_PATH}/${petId}`;
}

export function getAdminBreederReviewDetailPath(breederId: string): string {
  return `${ADMIN_BREEDER_REVIEWS_PATH}/${breederId}`;
}

export const BREEDER_REVIEW_PENDING_STATUSES = [
  "submitted",
  "under_review",
  "resubmission_required",
] as const;

export type BreederReviewPendingStatus = (typeof BREEDER_REVIEW_PENDING_STATUSES)[number];

export const BREEDER_REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  submitted: "申請済み",
  under_review: "審査中",
  resubmission_required: "差戻し",
  approved: "承認済み",
  rejected: "却下",
};

export const BREEDER_REVIEW_DETAIL_VIEWABLE_STATUSES = [
  "submitted",
  "under_review",
  "resubmission_required",
  "approved",
  "rejected",
] as const;

export type BreederReviewDetailViewableStatus =
  (typeof BREEDER_REVIEW_DETAIL_VIEWABLE_STATUSES)[number];

export const BREEDER_REVIEW_LOG_ACTIONS = [
  "submitted",
  "review_started",
  "approved",
  "returned",
  "rejected",
] as const;

export type BreederReviewLogAction = (typeof BREEDER_REVIEW_LOG_ACTIONS)[number];

export const BREEDER_REVIEW_LOG_ACTION_LABELS: Record<BreederReviewLogAction, string> = {
  submitted: "申請",
  review_started: "審査開始",
  approved: "承認",
  returned: "差戻し",
  rejected: "却下",
};

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  pending: "利用開始前",
  active: "利用中",
  suspended: "停止中",
  canceled: "解約済み",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trialing: "トライアル中",
  active: "有効",
  past_due: "支払い遅延",
  unpaid: "未払い",
  canceled: "解約",
};

/** Short-lived Signed URL for admin document preview (Decision No.132) */
export const BREEDER_DOCUMENT_SIGNED_URL_EXPIRES_SECONDS = 300;

export const ADMIN_BREEDER_DOCUMENT_UNAVAILABLE_MESSAGE = "書類を表示できませんでした";
export const ADMIN_BREEDER_DOCUMENT_MISSING_MESSAGE = "書類が未提出です";

export const ADMIN_BREEDER_REVIEW_START_DESCRIPTION = "提出内容と書類の確認を開始します。";
export const ADMIN_BREEDER_REVIEW_START_SUCCESS_MESSAGE = "審査を開始しました。";
export const ADMIN_BREEDER_REVIEW_START_ERROR_MESSAGE =
  "審査を開始できませんでした。状態を確認してもう一度お試しください。";

export const BREEDER_REVIEW_STARTABLE_STATUSES = ["submitted", "resubmission_required"] as const;

export type BreederReviewStartableStatus = (typeof BREEDER_REVIEW_STARTABLE_STATUSES)[number];

export function canStartBreederReview(reviewStatus: string): boolean {
  return (BREEDER_REVIEW_STARTABLE_STATUSES as readonly string[]).includes(reviewStatus);
}

export const BREEDER_REVIEW_ACTIONABLE_STATUS = "under_review" as const;

export function canPerformBreederReviewActions(reviewStatus: string): boolean {
  return reviewStatus === BREEDER_REVIEW_ACTIONABLE_STATUS;
}

export const ADMIN_BREEDER_REVIEW_LEGAL_NOTICE =
  "書類内容の最終判断については、弁護士または管轄自治体への確認が必要です。システムは書類の法的適否を自動判定しません。";

export const ADMIN_BREEDER_REVIEW_ACTIONS_DESCRIPTION =
  "書類と申請内容を確認のうえ、承認・差戻し・却下を行ってください。";

export const ADMIN_BREEDER_REVIEW_APPROVE_CONFIRM_MESSAGE = "このブリーダー申請を承認しますか？";

export const ADMIN_BREEDER_REVIEW_APPROVE_CONFIRM_NOTE =
  "承認後も月額課金が開始されるまでは利用開始状態にはなりません。";

export const ADMIN_BREEDER_REVIEW_RETURN_CONFIRM_MESSAGE =
  "このブリーダー申請を差し戻します。よろしいですか？";

export const ADMIN_BREEDER_REVIEW_REJECT_CONFIRM_MESSAGE =
  "このブリーダー申請を却下します。よろしいですか？";

export const ADMIN_BREEDER_REVIEW_APPROVE_SUCCESS_MESSAGE = "ブリーダー申請を承認しました。";
export const ADMIN_BREEDER_REVIEW_RETURN_SUCCESS_MESSAGE = "ブリーダー申請を差し戻しました。";
export const ADMIN_BREEDER_REVIEW_REJECT_SUCCESS_MESSAGE = "ブリーダー申請を却下しました。";

export const ADMIN_BREEDER_REVIEW_APPROVE_ERROR_MESSAGE =
  "承認できませんでした。申請内容と登録期限を確認してください。";

export const ADMIN_BREEDER_REVIEW_RETURN_ERROR_MESSAGE =
  "差戻しできませんでした。状態を確認してもう一度お試しください。";

export const ADMIN_BREEDER_REVIEW_REJECT_ERROR_MESSAGE =
  "却下できませんでした。状態を確認してもう一度お試しください。";

export const ADMIN_BREEDER_REVIEW_RETURN_COMMENT_PLACEHOLDER =
  "例：第一種動物取扱業登録証の画像が不鮮明です。再提出をお願いします。";

export const PET_REVIEW_LOG_ACTIONS = ["submitted", "returned", "approved"] as const;

export type PetReviewLogAction = (typeof PET_REVIEW_LOG_ACTIONS)[number];

export const PET_REVIEW_LOG_ACTION_LABELS: Record<PetReviewLogAction, string> = {
  submitted: "公開申請",
  returned: "差戻し",
  approved: "公開承認",
};

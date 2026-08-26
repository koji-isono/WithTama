export const PROFILE_EDITABLE_REVIEW_STATUSES = ["draft", "resubmission_required"] as const;

export type ProfileEditableReviewStatus = (typeof PROFILE_EDITABLE_REVIEW_STATUSES)[number];

export const PROFILE_NOT_EDITABLE_MESSAGE = "現在の申請状態ではプロフィールを変更できません。";

export function isProfileEditable(
  reviewStatus: string,
): reviewStatus is ProfileEditableReviewStatus {
  return (PROFILE_EDITABLE_REVIEW_STATUSES as readonly string[]).includes(reviewStatus);
}

export function assertProfileEditable(
  reviewStatus: string,
): asserts reviewStatus is ProfileEditableReviewStatus {
  if (!isProfileEditable(reviewStatus)) {
    throw new Error(PROFILE_NOT_EDITABLE_MESSAGE);
  }
}

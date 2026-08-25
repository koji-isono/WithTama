const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validatePetIdForAdminReview(petId: string): string | null {
  const trimmed = petId.trim();

  if (!trimmed) {
    return "対象の犬猫が指定されていません。";
  }

  if (!UUID_REGEX.test(trimmed)) {
    return "対象の犬猫 ID が不正です。";
  }

  return null;
}

export function validateReturnReviewComment(comment: string): string | null {
  if (comment.trim().length === 0) {
    return "差戻し理由を入力してください。";
  }

  return null;
}

export function validateBreederReviewActionComment(
  comment: string,
  fieldLabel: string,
): string | null {
  if (comment.trim().length === 0) {
    return `${fieldLabel}を入力してください。`;
  }

  return null;
}

export function validateBreederIdForAdminReview(breederId: string): string | null {
  const trimmed = breederId.trim();

  if (!trimmed) {
    return "対象のブリーダーが指定されていません。";
  }

  if (!UUID_REGEX.test(trimmed)) {
    return "対象のブリーダー ID が不正です。";
  }

  return null;
}

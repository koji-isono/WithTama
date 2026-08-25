import {
  ADMIN_BREEDER_REVIEW_APPROVE_ERROR_MESSAGE,
  ADMIN_BREEDER_REVIEW_REJECT_ERROR_MESSAGE,
  ADMIN_BREEDER_REVIEW_RETURN_ERROR_MESSAGE,
  ADMIN_BREEDER_REVIEW_START_ERROR_MESSAGE,
  ADMIN_PET_REVIEW_GENERIC_ERROR_MESSAGE,
} from "./constants";

export type AdminBreederReviewRpcAction = "start" | "approve" | "return" | "reject";

function defaultBreederReviewErrorMessage(action: AdminBreederReviewRpcAction): string {
  switch (action) {
    case "approve":
      return ADMIN_BREEDER_REVIEW_APPROVE_ERROR_MESSAGE;
    case "return":
      return ADMIN_BREEDER_REVIEW_RETURN_ERROR_MESSAGE;
    case "reject":
      return ADMIN_BREEDER_REVIEW_REJECT_ERROR_MESSAGE;
    default:
      return ADMIN_BREEDER_REVIEW_START_ERROR_MESSAGE;
  }
}

export function mapAdminBreederReviewRpcError(
  error: unknown,
  action: AdminBreederReviewRpcAction = "start",
): string {
  const fallback = defaultBreederReviewErrorMessage(action);

  if (!error || typeof error !== "object" || !("message" in error)) {
    return fallback;
  }

  const message = String((error as { message: string }).message).toLowerCase();

  if (message.includes("admin required") || message.includes("authentication required")) {
    return "管理者権限が必要です。";
  }

  if (message.includes("breeder not found")) {
    return "対象のブリーダーが見つかりません。";
  }

  if (message.includes("invalid review status")) {
    return fallback;
  }

  if (message.includes("breeder not eligible for approval")) {
    return ADMIN_BREEDER_REVIEW_APPROVE_ERROR_MESSAGE;
  }

  if (message.includes("return comment required")) {
    return "差戻し理由を入力してください。";
  }

  if (message.includes("reject comment required")) {
    return "却下理由を入力してください。";
  }

  if (message.includes("breeder id is required")) {
    return "対象のブリーダーが指定されていません。";
  }

  return fallback;
}

export function mapAdminPetReviewRpcError(error: unknown): string {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return ADMIN_PET_REVIEW_GENERIC_ERROR_MESSAGE;
  }

  const message = String((error as { message: string }).message).toLowerCase();

  if (message.includes("admin required") || message.includes("authentication required")) {
    return "管理者権限が必要です。";
  }

  if (message.includes("pet not found")) {
    return "対象の犬猫が見つかりません。";
  }

  if (message.includes("invalid pet status")) {
    return "この犬猫は審査対象ではありません。すでに処理済みの可能性があります。";
  }

  if (message.includes("breeder not eligible for publication")) {
    return "ブリーダーの審査状態または登録情報が公開承認条件を満たしていません。";
  }

  if (message.includes("return comment required")) {
    return "差戻し理由を入力してください。";
  }

  if (message.includes("published_at inconsistency")) {
    return "データの状態が不正です。管理者にお問い合わせください。";
  }

  if (message.includes("pet id is required")) {
    return "対象の犬猫が指定されていません。";
  }

  return ADMIN_PET_REVIEW_GENERIC_ERROR_MESSAGE;
}

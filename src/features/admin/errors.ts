import { ADMIN_PET_REVIEW_GENERIC_ERROR_MESSAGE } from "./constants";

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

export const BILLING_PORTAL_API_PATH = "/api/billing/portal";

export const BILLING_PORTAL_UNAUTHORIZED_MESSAGE = "ログインが必要です。";
export const BILLING_PORTAL_FORBIDDEN_ROLE_MESSAGE = "この操作はブリーダーアカウント専用です。";
export const BILLING_PORTAL_BREEDER_NOT_FOUND_MESSAGE = "ブリーダー情報が見つかりません。";
export const BILLING_PORTAL_REVIEW_NOT_APPROVED_MESSAGE =
  "審査承認後にお支払い設定を確認できます。";
export const BILLING_PORTAL_NO_CUSTOMER_MESSAGE =
  "お支払い情報がまだ登録されていません。月額会費のお支払い手続きを完了してください。";
export const BILLING_PORTAL_INVALID_MEMBERSHIP_MESSAGE =
  "現在の会員状態ではお支払い設定を確認できません。";
export const BILLING_PORTAL_CLIENT_INPUT_FORBIDDEN_MESSAGE = "リクエスト内容が正しくありません。";
export const BILLING_PORTAL_GENERIC_ERROR_MESSAGE =
  "お支払い設定画面を開けませんでした。時間をおいてもう一度お試しください。";

/** Portal 利用を Step 7 で許可する membership_status（Decision No.144 / No.145） */
export const PORTAL_ALLOWED_MEMBERSHIP_STATUSES = ["active", "suspended"] as const;

export type PortalAllowedMembershipStatus = (typeof PORTAL_ALLOWED_MEMBERSHIP_STATUSES)[number];

export const BILLING_CHECKOUT_API_PATH = "/api/billing/checkout";

export const BILLING_CHECKOUT_UNAUTHORIZED_MESSAGE = "ログインが必要です。";
export const BILLING_CHECKOUT_FORBIDDEN_ROLE_MESSAGE = "この操作はブリーダーアカウント専用です。";
export const BILLING_CHECKOUT_BREEDER_NOT_FOUND_MESSAGE = "ブリーダー情報が見つかりません。";
export const BILLING_CHECKOUT_REVIEW_NOT_APPROVED_MESSAGE =
  "審査承認後に月額会費のお支払い手続きが可能になります。";
export const BILLING_CHECKOUT_ALREADY_ACTIVE_MESSAGE =
  "すでに有効な契約があります。カード変更や解約は今後提供予定の管理画面から行えます。";
export const BILLING_CHECKOUT_SUSPENDED_MESSAGE =
  "お支払いの確認が必要なため、現在は新しいお支払い手続きを開始できません。しばらくお待ちいただくか、サポートにお問い合わせください。";
export const BILLING_CHECKOUT_INVALID_MEMBERSHIP_MESSAGE =
  "現在の会員状態ではお支払い手続きを開始できません。";
export const BILLING_CHECKOUT_CLIENT_INPUT_FORBIDDEN_MESSAGE = "リクエスト内容が正しくありません。";
export const BILLING_CHECKOUT_GENERIC_ERROR_MESSAGE =
  "お支払い手続きの開始に失敗しました。時間をおいてもう一度お試しください。";
export const BILLING_CHECKOUT_EMAIL_REQUIRED_MESSAGE =
  "メールアドレスが未設定のため、お支払い手続きを開始できません。";

/** Checkout 開始を Step 3 で許可する membership_status（Decision No.144） */
export const CHECKOUT_ALLOWED_MEMBERSHIP_STATUSES = ["pending", "canceled"] as const;

export type CheckoutAllowedMembershipStatus = (typeof CHECKOUT_ALLOWED_MEMBERSHIP_STATUSES)[number];

export const BREEDER_CHECKOUT_SUCCESS_QUERY = "checkout=success";
export const BREEDER_CHECKOUT_CANCEL_QUERY = "checkout=cancel";

/** BR-13 未実装のため Step 3 は既存ダッシュボードへ戻す */
export const BREEDER_CHECKOUT_RETURN_PATH = "/breeder/dashboard";

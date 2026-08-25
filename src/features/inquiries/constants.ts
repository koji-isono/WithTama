export const BUYER_INQUIRY_NEW_PATH = "/buyer/inquiries/new";
export const BUYER_INQUIRY_NEW_SCREEN_ID = "BY-04";

export const INQUIRY_MESSAGE_MAX_LENGTH = 2000;

export const ACTIVE_INQUIRY_STATUSES = [
  "open",
  "replied",
  "visit_requested",
  "visit_scheduled",
] as const;

export const INQUIRY_UNAUTHORIZED_MESSAGE = "問い合わせにはログインが必要です。";
export const INQUIRY_FORBIDDEN_ROLE_MESSAGE =
  "購入希望者アカウントでのみ問い合わせを送信できます。";
export const INQUIRY_BUYER_NOT_FOUND_MESSAGE =
  "購入希望者プロフィールが見つかりません。再度ログインしてください。";
export const INQUIRY_PROFILE_INCOMPLETE_MESSAGE =
  "問い合わせを送信するにはプロフィール登録を完了してください。";
export const INQUIRY_PET_NOT_FOUND_MESSAGE = "対象の犬猫が見つかりません。";
export const INQUIRY_PET_NOT_AVAILABLE_MESSAGE = "現在お問い合わせできない犬猫です。";
export const INQUIRY_PET_ID_REQUIRED_MESSAGE = "問い合わせ対象の犬猫が指定されていません。";
export const INQUIRY_MESSAGE_REQUIRED_MESSAGE = "問い合わせ内容を入力してください。";
export const INQUIRY_MESSAGE_MAX_LENGTH_MESSAGE = "2000文字以内で入力してください。";
export const INQUIRY_SUBMIT_ERROR_MESSAGE = "送信に失敗しました。時間をおいて再度お試しください。";
export const INQUIRY_INQUIRY_CREATE_ERROR_MESSAGE = "問い合わせの作成に失敗しました。";
export const INQUIRY_MESSAGE_CREATE_ERROR_MESSAGE = "メッセージの送信に失敗しました。";
export const INQUIRY_NOT_FOUND_MESSAGE = "問い合わせが見つかりません。";
export const INQUIRY_REPLY_NOT_ALLOWED_MESSAGE = "この問い合わせには返信できません。";
export const INQUIRY_INVALID_ID_MESSAGE = "問い合わせ ID が不正です。";

export const BUYER_INQUIRY_LIST_PATH = "/buyer/inquiries";
export const BUYER_INQUIRY_LIST_SCREEN_ID = "BY-05";

export const INQUIRY_LIST_MAX_ITEMS = 50;
export const INQUIRY_MESSAGE_PREVIEW_MAX_LENGTH = 80;

export const INQUIRY_LIST_LOAD_ERROR_MESSAGE =
  "問い合わせ履歴の取得に失敗しました。時間をおいて再度お試しください。";

export const BUYER_INQUIRY_DETAIL_SCREEN_ID = "BY-06";

export const BREEDER_INQUIRY_LIST_PATH = "/breeder/inquiries";
export const BREEDER_INQUIRY_LIST_SCREEN_ID = "BR-12";

export const INQUIRY_BREEDER_FORBIDDEN_MESSAGE =
  "ブリーダーアカウントでのみ問い合わせを確認できます。";
export const INQUIRY_BREEDER_NOT_FOUND_MESSAGE =
  "ブリーダープロフィールが見つかりません。再度ログインしてください。";
export const INQUIRY_BREEDER_LIST_LOAD_ERROR_MESSAGE =
  "問い合わせ一覧の取得に失敗しました。時間をおいて再度お試しください。";

export const INQUIRY_BUYER_DISPLAY_NAME_FALLBACK = "購入希望者";

export const INQUIRY_MESSAGE_SENDABLE_STATUSES = [...ACTIVE_INQUIRY_STATUSES] as const;

export function canBuyerSendInquiryMessage(status: string): boolean {
  return (INQUIRY_MESSAGE_SENDABLE_STATUSES as readonly string[]).includes(status);
}

export function getInquiryClosedNotice(status: string): string | null {
  if (status === "closed") {
    return "この問い合わせは終了しています。";
  }

  if (status === "completed") {
    return "この問い合わせは完了しています。";
  }

  return null;
}

export function getBuyerInquiryNewPath(petId: string): string {
  return `${BUYER_INQUIRY_NEW_PATH}?petId=${encodeURIComponent(petId)}`;
}

export function getBuyerInquiryDetailPath(inquiryId: string): string {
  return `/buyer/inquiries/${inquiryId}`;
}

export function getBreederInquiryDetailPath(inquiryId: string): string {
  return `/breeder/inquiries/${inquiryId}`;
}

export function canBreederSendInquiryMessage(status: string): boolean {
  return canBuyerSendInquiryMessage(status);
}

export function buildInquirySubject(publicDisplayName: string | null | undefined): string {
  const name = publicDisplayName?.trim();

  if (name) {
    return `${name}についてのお問い合わせ`;
  }

  return "犬猫についてのお問い合わせ";
}

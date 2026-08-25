export const BUYER_VISIT_NEW_PATH = "/buyer/visits/new";
export const BUYER_VISIT_NEW_SCREEN_ID = "BY-07";
export const BUYER_VISIT_LIST_SCREEN_ID = "BY-08";
export const BUYER_VISIT_DETAIL_SCREEN_ID = "BY-09";
export const BUYER_VISIT_LIST_PATH = "/buyer/visits";

export const BREEDER_VISIT_LIST_PATH = "/breeder/visits";
export const BREEDER_VISIT_LIST_SCREEN_ID = "BR-14";
export const BREEDER_VISIT_DETAIL_SCREEN_ID = "BR-15";

export const VISIT_LIST_MAX_ITEMS = 50;
export const VISIT_LIST_LOAD_ERROR_MESSAGE =
  "見学予定一覧を読み込めませんでした。時間をおいてもう一度お試しください。";
export const VISIT_LIST_EMPTY_TITLE = "見学予定はまだありません。";
export const VISIT_LIST_EMPTY_DESCRIPTION =
  "気になる犬猫について問い合わせのうえ、見学を希望できます。";

export const BREEDER_VISIT_LIST_LOAD_ERROR_MESSAGE =
  "見学管理一覧を読み込めませんでした。時間をおいてもう一度お試しください。";
export const BREEDER_VISIT_LIST_EMPTY_TITLE = "見学希望はまだありません。";
export const BREEDER_VISIT_LIST_EMPTY_DESCRIPTION =
  "購入希望者から見学希望が届くと、ここに表示されます。";

export const VISIT_CANCELLATION_REASON_MAX_LENGTH = 2000;

export const VISIT_CANCEL_CONFIRM_TITLE = "この見学予定をキャンセルしますか？";
export const VISIT_CANCEL_CONFIRM_MESSAGE =
  "キャンセル後も問い合わせ詳細からブリーダーへメッセージを送れます。";
export const VISIT_CANCEL_SUCCESS_MESSAGE = "見学をキャンセルしました。";
export const VISIT_CANCEL_ERROR_MESSAGE =
  "見学のキャンセルに失敗しました。時間をおいてもう一度お試しください。";
export const VISIT_CANNOT_CANCEL_MESSAGE = "この見学は変更できません。";
export const VISIT_NOT_FOUND_MESSAGE = "見学が見つかりません。";
export const VISIT_CANCELLATION_REASON_MAX_LENGTH_MESSAGE = "2000文字以内で入力してください。";

export const VISIT_CANCEL_ELIGIBLE_STATUSES = ["requested", "scheduled"] as const;

export const VISIT_REQUEST_ELIGIBLE_INQUIRY_STATUSES = ["open", "replied"] as const;

export const VISIT_REQUEST_SUCCESS_MESSAGE =
  "見学希望を送信しました。ブリーダーからの日程確認をお待ちください。";

export const VISIT_UNAUTHORIZED_MESSAGE = "見学希望の送信にはログインが必要です。";
export const VISIT_FORBIDDEN_ROLE_MESSAGE = "購入希望者アカウントでのみ見学希望を送信できます。";
export const VISIT_BUYER_NOT_FOUND_MESSAGE =
  "購入希望者プロフィールが見つかりません。再度ログインしてください。";
export const VISIT_PROFILE_INCOMPLETE_MESSAGE =
  "見学希望を送信するにはプロフィール登録を完了してください。";
export const VISIT_INQUIRY_NOT_FOUND_MESSAGE = "問い合わせが見つかりません。";
export const VISIT_INQUIRY_ID_REQUIRED_MESSAGE = "問い合わせが指定されていません。";
export const VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE = "この問い合わせでは見学希望を送れません。";
export const VISIT_ALREADY_EXISTS_MESSAGE = "すでに見学希望が登録されています。";
export const VISIT_FIRST_DATETIME_REQUIRED_MESSAGE = "第一希望日時を入力してください。";
export const VISIT_INVALID_DATETIME_MESSAGE = "有効な日時を入力してください。";
export const VISIT_PAST_DATETIME_MESSAGE = "未来の日時を選択してください。";
export const VISIT_DATETIME_ORDER_MESSAGE =
  "第二・第三希望は、前の希望より後の日時を入力してください。";
export const VISIT_MESSAGE_REQUIRED_MESSAGE = "メッセージを入力してください。";
export const VISIT_MESSAGE_MAX_LENGTH_MESSAGE = "2000文字以内で入力してください。";
export const VISIT_SUBMIT_ERROR_MESSAGE =
  "見学希望を送信できませんでした。時間をおいてもう一度お試しください。";
export const VISIT_UNAUTHORIZED_INQUIRY_MESSAGE = "この問い合わせでは見学を申し込めません。";

export const VISIT_BREEDER_UNAUTHORIZED_MESSAGE =
  "見学の操作にはブリーダーとしてログインが必要です。";
export const VISIT_BREEDER_FORBIDDEN_ROLE_MESSAGE =
  "ブリーダーアカウントでのみ見学を管理できます。";
export const VISIT_BREEDER_NOT_FOUND_MESSAGE =
  "ブリーダープロフィールが見つかりません。再度ログインしてください。";

export const VISIT_SCHEDULE_SUCCESS_MESSAGE = "見学日時を確定しました。";
export const VISIT_SCHEDULE_ERROR_MESSAGE =
  "見学日時の確定に失敗しました。時間をおいてもう一度お試しください。";
export const VISIT_SCHEDULE_DATETIME_REQUIRED_MESSAGE = "確定日時を入力してください。";
export const VISIT_CANNOT_SCHEDULE_MESSAGE = "この見学は日時を確定できません。";

export const VISIT_COMPLETE_SUCCESS_MESSAGE = "見学を完了しました。";
export const VISIT_COMPLETE_ERROR_MESSAGE =
  "見学の完了処理に失敗しました。時間をおいてもう一度お試しください。";
export const VISIT_COMPLETE_RESULT_REQUIRED_MESSAGE = "見学結果を選択してください。";
export const VISIT_COMPLETE_FLAGS_REQUIRED_MESSAGE = "現物確認と対面説明の実施を確認してください。";
export const VISIT_CANNOT_COMPLETE_MESSAGE = "この見学は完了できません。";
export const VISIT_COMPLETE_BEFORE_SCHEDULED_MESSAGE =
  "確定した見学日時より前に見学を完了することはできません。";
export const VISIT_COMPLETE_FUTURE_HINT = "見学完了は確定した見学日時以降に記録できます。";
export const VISIT_COMPLETE_CONTRACTED_HINT =
  "「成約」はサイト上での契約ではなく、別途行われた結果の記録です。";

export const BREEDER_VISIT_CANCEL_CONFIRM_MESSAGE =
  "キャンセル後も問い合わせ詳細から購入希望者へメッセージを送れます。";

export const VISIT_COMPLETE_RESULT_OPTIONS = [
  { value: "contracted", label: "成約" },
  { value: "declined", label: "見送り" },
  { value: "considering", label: "検討中" },
] as const;

export function getBuyerVisitNewPath(inquiryId: string): string {
  return `${BUYER_VISIT_NEW_PATH}?inquiryId=${encodeURIComponent(inquiryId)}`;
}

export function getBuyerVisitDetailPath(visitId: string): string {
  return `/buyer/visits/${visitId}`;
}

export function getBreederVisitDetailPath(visitId: string): string {
  return `${BREEDER_VISIT_LIST_PATH}/${visitId}`;
}

export function isVisitRequestEligibleInquiryStatus(status: string): boolean {
  return (VISIT_REQUEST_ELIGIBLE_INQUIRY_STATUSES as readonly string[]).includes(status);
}

import type { InquiryVisitNavigation } from "./types";

export function resolveInquiryVisitNavigation(input: {
  inquiryId: string;
  inquiryStatus: string;
  visitId: string | null;
}): InquiryVisitNavigation {
  if (input.visitId) {
    return {
      kind: "detail",
      href: getBuyerVisitDetailPath(input.visitId),
      label: "見学詳細を見る",
    };
  }

  if (isVisitRequestEligibleInquiryStatus(input.inquiryStatus)) {
    return {
      kind: "request",
      href: getBuyerVisitNewPath(input.inquiryId),
      label: "見学を希望する",
    };
  }

  return { kind: "none" };
}

export function canBuyerCancelVisit(status: string): boolean {
  return (VISIT_CANCEL_ELIGIBLE_STATUSES as readonly string[]).includes(status);
}

export function canBreederScheduleVisit(status: string): boolean {
  return status === "requested";
}

export function canBreederCompleteVisit(status: string): boolean {
  return status === "scheduled";
}

export function isVisitCompleteAllowedNow(scheduledAt: string | null | undefined): boolean {
  if (!scheduledAt) {
    return false;
  }

  return new Date(scheduledAt).getTime() <= Date.now();
}

export function canBreederCancelVisit(status: string): boolean {
  return canBuyerCancelVisit(status);
}

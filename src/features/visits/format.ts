import { formatInquiryDateTime } from "@/features/inquiries/format";

import type { VisitResult, VisitStatus } from "./types";

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  requested: "見学希望受付",
  scheduled: "見学日時確定",
  completed: "見学完了",
  canceled: "キャンセル",
};

export const VISIT_RESULT_LABELS: Record<VisitResult, string> = {
  pending: "未決定",
  contracted: "成約",
  declined: "見送り",
  considering: "検討中",
};

export function getVisitStatusLabel(status: string): string {
  if (status in VISIT_STATUS_LABELS) {
    return VISIT_STATUS_LABELS[status as VisitStatus];
  }

  return "見学希望受付";
}

export function getVisitResultLabel(result: string): string {
  if (result in VISIT_RESULT_LABELS) {
    return VISIT_RESULT_LABELS[result as VisitResult];
  }

  return "未決定";
}

export function formatVisitDateTime(isoString: string | null | undefined): string | null {
  if (!isoString) {
    return null;
  }

  return formatInquiryDateTime(isoString);
}

export function formatVisitImplementationFlag(value: boolean): string {
  return value ? "実施済み" : "未実施";
}

const VISIT_LIST_DATETIME_FIELD_LABELS: Record<VisitStatus, string> = {
  requested: "第一希望",
  scheduled: "見学日時",
  completed: "完了日時",
  canceled: "キャンセル日時",
};

export const VISIT_LIST_STATUS_HINTS: Record<VisitStatus, string> = {
  requested: "ブリーダーからの日程確定をお待ちください",
  scheduled: "見学日時が確定しました",
  completed: "見学が完了しました",
  canceled: "この見学はキャンセルされました",
};

export function getVisitListDateTimeFieldLabel(status: string): string {
  if (status in VISIT_LIST_DATETIME_FIELD_LABELS) {
    return VISIT_LIST_DATETIME_FIELD_LABELS[status as VisitStatus];
  }

  return "日時";
}

export function getVisitListStatusHint(status: string): string {
  if (status in VISIT_LIST_STATUS_HINTS) {
    return VISIT_LIST_STATUS_HINTS[status as VisitStatus];
  }

  return VISIT_LIST_STATUS_HINTS.requested;
}

export const BREEDER_VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  requested: "見学希望（要対応）",
  scheduled: "見学予定",
  completed: "見学完了",
  canceled: "キャンセル",
};

export const BREEDER_VISIT_LIST_DATETIME_FIELD_LABELS: Record<VisitStatus, string> = {
  requested: "見学希望日時",
  scheduled: "確定日時",
  completed: "完了日時",
  canceled: "キャンセル日時",
};

export const BREEDER_VISIT_LIST_STATUS_HINTS: Record<VisitStatus, string> = {
  requested: "購入希望者からの見学希望です。日程の確定が必要です。",
  scheduled: "見学予定が確定しています。",
  completed: "見学が完了しました。",
  canceled: "この見学はキャンセルされました。",
};

export function getBreederVisitStatusLabel(status: string): string {
  if (status in BREEDER_VISIT_STATUS_LABELS) {
    return BREEDER_VISIT_STATUS_LABELS[status as VisitStatus];
  }

  return BREEDER_VISIT_STATUS_LABELS.requested;
}

export function getBreederVisitListDateTimeFieldLabel(status: string): string {
  if (status in BREEDER_VISIT_LIST_DATETIME_FIELD_LABELS) {
    return BREEDER_VISIT_LIST_DATETIME_FIELD_LABELS[status as VisitStatus];
  }

  return "日時";
}

export function getBreederVisitListStatusHint(status: string): string {
  if (status in BREEDER_VISIT_LIST_STATUS_HINTS) {
    return BREEDER_VISIT_LIST_STATUS_HINTS[status as VisitStatus];
  }

  return BREEDER_VISIT_LIST_STATUS_HINTS.requested;
}

export function sortBreederVisitsForList<
  T extends {
    status: string;
    scheduled_at: string | null;
    requested_at: string;
    created_at: string;
  },
>(visits: T[]): T[] {
  return [...visits].sort((a, b) => {
    const aRequested = a.status === "requested" ? 0 : 1;
    const bRequested = b.status === "requested" ? 0 : 1;

    if (aRequested !== bRequested) {
      return aRequested - bRequested;
    }

    const aScheduled = a.scheduled_at
      ? new Date(a.scheduled_at).getTime()
      : Number.POSITIVE_INFINITY;
    const bScheduled = b.scheduled_at
      ? new Date(b.scheduled_at).getTime()
      : Number.POSITIVE_INFINITY;

    if (aScheduled !== bScheduled) {
      return aScheduled - bScheduled;
    }

    const aRequestedAt = new Date(a.requested_at).getTime();
    const bRequestedAt = new Date(b.requested_at).getTime();

    if (aRequestedAt !== bRequestedAt) {
      return bRequestedAt - aRequestedAt;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function formatVisitListPrimaryDateTime(visit: {
  status: string;
  scheduled_at: string | null;
  requested_at: string;
  completed_at: string | null;
  canceled_at: string | null;
}): string {
  let iso: string | null | undefined;

  switch (visit.status) {
    case "scheduled":
      iso = visit.scheduled_at;
      break;
    case "completed":
      iso = visit.completed_at;
      break;
    case "canceled":
      iso = visit.canceled_at;
      break;
    case "requested":
    default:
      iso = visit.requested_at;
      break;
  }

  return formatVisitDateTime(iso) ?? "—";
}

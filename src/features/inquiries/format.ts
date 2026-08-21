import type { InquiryStatus } from "./types";

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  open: "問い合わせ中",
  replied: "返信あり",
  visit_requested: "見学希望",
  visit_scheduled: "見学予定",
  completed: "完了",
  closed: "終了",
};

export function getInquiryStatusLabel(status: string): string {
  if (status in INQUIRY_STATUS_LABELS) {
    return INQUIRY_STATUS_LABELS[status as InquiryStatus];
  }

  return "問い合わせ中";
}

export function formatInquiryDateTime(isoString: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export function getInquiryMessageSenderLabel(senderType: string): string {
  if (senderType === "buyer") {
    return "あなた";
  }

  if (senderType === "breeder") {
    return "ブリーダー";
  }

  if (senderType === "admin") {
    return "運営";
  }

  return "送信者";
}

export function extractPetNameFromInquirySubject(subject: string | null): string | null {
  if (!subject) {
    return null;
  }

  const suffix = "についてのお問い合わせ";

  if (!subject.endsWith(suffix)) {
    return null;
  }

  const name = subject.slice(0, -suffix.length).trim();

  return name || null;
}

export function truncateInquiryMessagePreview(message: string, maxLength = 80): string {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
}

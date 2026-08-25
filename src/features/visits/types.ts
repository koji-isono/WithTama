import type { InquiryMessageFieldErrors } from "@/features/inquiries/types";

export type VisitListItem = {
  visitId: string;
  inquiryId: string;
  status: string;
  statusLabel: string;
  statusHint: string;
  inquiryStatusLabel: string;
  publicDisplayName: string;
  attributeLine: string | null;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  breederBusinessName: string | null;
  dateTimeFieldLabel: string;
  dateTimeLabel: string;
  detailHref: string;
  inquiryDetailHref: string;
};

export type BuyerVisitsPageData = {
  items: VisitListItem[];
};

export type BreederVisitListItem = {
  visitId: string;
  inquiryId: string;
  status: string;
  statusLabel: string;
  statusHint: string;
  inquiryStatusLabel: string;
  publicDisplayName: string;
  attributeLine: string | null;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  buyerDisplayName: string;
  dateTimeFieldLabel: string;
  dateTimeLabel: string;
  detailHref: string;
};

export type BreederVisitsPageData = {
  items: BreederVisitListItem[];
};

export type VisitStartUiState =
  | { status: "hidden" }
  | { status: "guest"; href: string }
  | { status: "profile_incomplete"; href: string }
  | { status: "link"; href: string; label: string };

export type InquiryVisitNavigation =
  | { kind: "none" }
  | { kind: "request"; href: string; label: "見学を希望する" }
  | { kind: "detail"; href: string; label: "見学詳細を見る" };

export type VisitRequestPagePetSummary = {
  id: string;
  publicDisplayName: string;
  attributeLine: string;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  breederBusinessName: string | null;
  inquiryStatusLabel: string;
};

export type VisitRequestPageData = {
  inquiryId: string;
  pet: VisitRequestPagePetSummary;
};

export type VisitRequestFieldErrors = InquiryMessageFieldErrors & {
  requestedAt?: string;
  requestedAtSecond?: string;
  requestedAtThird?: string;
};

export type RequestVisitActionResult =
  | { success: true; visitId: string }
  | {
      success: false;
      error: string;
      fieldErrors?: VisitRequestFieldErrors;
      redirectTo?: string;
    };

export type VisitRequestFormInput = {
  inquiryId: string;
  requestedAt: string;
  requestedAtSecond: string;
  requestedAtThird: string;
  message: string;
};

export type VisitStatus = "requested" | "scheduled" | "completed" | "canceled";

export type VisitResult = "pending" | "contracted" | "declined" | "considering";

export type VisitRow = {
  id: string;
  inquiry_id: string;
  buyer_id: string;
  breeder_id: string;
  pet_id: string;
  requested_at: string;
  requested_at_second: string | null;
  requested_at_third: string | null;
  scheduled_at: string | null;
  status: string;
  animal_confirmed: boolean;
  explanation_completed: boolean;
  result: string;
  completed_at: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  breeder_note: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type VisitDetailPageSummary = {
  visitId: string;
  inquiryId: string;
  status: string;
  statusLabel: string;
  inquiryStatusLabel: string;
  petId: string;
  publicDisplayName: string;
  attributeLine: string | null;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  breederBusinessName: string | null;
  requestedAtLabel: string;
  requestedAtSecondLabel: string | null;
  requestedAtThirdLabel: string | null;
  scheduledAtLabel: string | null;
  createdAtLabel: string;
  completedAtLabel: string | null;
  canceledAtLabel: string | null;
  cancellationReason: string | null;
  resultLabel: string | null;
  animalConfirmedLabel: string | null;
  explanationCompletedLabel: string | null;
  requestMessage: string | null;
};

export type VisitDetailPageData = {
  summary: VisitDetailPageSummary;
  canCancel: boolean;
};

export type BreederVisitDetailPageSummary = {
  visitId: string;
  inquiryId: string;
  status: string;
  statusLabel: string;
  inquiryStatusLabel: string;
  petId: string;
  publicDisplayName: string;
  attributeLine: string | null;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  buyerDisplayName: string;
  requestedAtLabel: string;
  requestedAtSecondLabel: string | null;
  requestedAtThirdLabel: string | null;
  scheduledAtLabel: string | null;
  inquiryCreatedAtLabel: string;
  createdAtLabel: string;
  completedAtLabel: string | null;
  canceledAtLabel: string | null;
  cancellationReason: string | null;
  resultLabel: string | null;
  animalConfirmedLabel: string | null;
  explanationCompletedLabel: string | null;
  breederNote: string | null;
  requestMessage: string | null;
};

export type BreederVisitDetailPageData = {
  summary: BreederVisitDetailPageSummary;
  canSchedule: boolean;
  canComplete: boolean;
  canCompleteNow: boolean;
  canCancel: boolean;
};

export type ScheduleVisitFieldErrors = {
  scheduledAt?: string;
};

export type CompleteVisitFieldErrors = {
  animalConfirmed?: string;
  explanationCompleted?: string;
  result?: string;
};

export type ScheduleVisitActionResult =
  { success: true } | { success: false; error: string; fieldErrors?: ScheduleVisitFieldErrors };

export type CompleteVisitActionResult =
  { success: true } | { success: false; error: string; fieldErrors?: CompleteVisitFieldErrors };

export type ScheduleVisitFormInput = {
  visitId: string;
  scheduledAt: string;
};

export type CompleteVisitFormInput = {
  visitId: string;
  animalConfirmed: boolean;
  explanationCompleted: boolean;
  result: string;
};

export type CancelVisitActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: { cancellationReason?: string } };

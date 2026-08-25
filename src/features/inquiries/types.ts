export type ActiveInquiryStatus = "open" | "replied" | "visit_requested" | "visit_scheduled";

export type InquiryStatus = ActiveInquiryStatus | "completed" | "closed";

export type InquiryRow = {
  id: string;
  buyer_id: string;
  breeder_id: string;
  pet_id: string;
  status: string;
  subject: string | null;
  last_message_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type PublishedPetInquiryContextRow = {
  id: string;
  breeder_id: string;
  public_display_name: string | null;
};

export type InquiryNewPagePetSummary = {
  id: string;
  publicDisplayName: string;
  attributeLine: string;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  breederBusinessName: string | null;
};

export type InquiryNewPageData = {
  petId: string;
  pet: InquiryNewPagePetSummary;
};

export type InquiryMessageFieldErrors = {
  message?: string;
};

export type CreateInquiryActionResult =
  | { success: true; inquiryId: string }
  | { success: false; error: string; fieldErrors?: InquiryMessageFieldErrors; redirectTo?: string };

export type InquiryStartUiState =
  | { status: "hidden" }
  | { status: "guest"; href: string }
  | { status: "profile_incomplete"; href: string }
  | { status: "existing"; href: string }
  | { status: "new"; href: string };

export type InquiryMessageRow = {
  id: string;
  inquiry_id: string;
  sender_type: string;
  sender_user_id: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type InquiryDetailMessage = {
  id: string;
  senderLabel: string;
  senderType: string;
  message: string;
  createdAt: string;
  createdAtLabel: string;
  isOwnMessage: boolean;
};

export type InquiryDetailPageSummary = {
  inquiryId: string;
  status: string;
  statusLabel: string;
  createdAtLabel: string;
  petId: string;
  publicDisplayName: string;
  attributeLine: string | null;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  breederBusinessName: string | null;
  isPetPubliclyVisible: boolean;
};

export type InquiryDetailPageData = {
  summary: InquiryDetailPageSummary;
  messages: InquiryDetailMessage[];
  canSendMessage: boolean;
  closedNotice: string | null;
  visitNavigation:
    | { kind: "none" }
    | { kind: "request"; href: string; label: "見学を希望する" }
    | { kind: "detail"; href: string; label: "見学詳細を見る" };
};

export type SendInquiryMessageActionResult =
  { success: true } | { success: false; error: string; fieldErrors?: InquiryMessageFieldErrors };

export type InquiryListItem = {
  inquiryId: string;
  petId: string;
  publicDisplayName: string;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  breederBusinessName: string | null;
  status: string;
  statusLabel: string;
  lastActivityAtLabel: string;
  latestMessagePreview: string;
  unreadBreederCount: number;
  detailHref: string;
};

export type BuyerInquiriesPageData = {
  items: InquiryListItem[];
};

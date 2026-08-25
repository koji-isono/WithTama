import "server-only";

import { redirect } from "next/navigation";

import { isAdminUser, parseMemberUserRole } from "@/features/auth";
import { requireBreeder } from "@/features/auth/breeder-auth";
import { getCurrentBuyer, requireBuyer } from "@/features/auth/buyer-auth";
import { getBuyerProfileByUserId } from "@/features/buyers/repository";
import { getBreederIdByUserId } from "@/features/pets/repository";
import { formatPublicPetAttributeLine, formatPublicPetPhotoAlt } from "@/features/pets/list-format";
import {
  getPublishedPetDetailForPublic,
  listPublishedPetsForPublicByIds,
} from "@/features/pets/public-repository";
import { createClient } from "@/lib/supabase/server";

import {
  BUYER_INQUIRY_DETAIL_SCREEN_ID,
  BUYER_INQUIRY_LIST_SCREEN_ID,
  BUYER_INQUIRY_NEW_SCREEN_ID,
  getBreederInquiryDetailPath,
  getBuyerInquiryDetailPath,
  getBuyerInquiryNewPath,
  INQUIRY_BREEDER_LIST_LOAD_ERROR_MESSAGE,
  INQUIRY_BUYER_DISPLAY_NAME_FALLBACK,
  INQUIRY_LIST_LOAD_ERROR_MESSAGE,
  INQUIRY_MESSAGE_PREVIEW_MAX_LENGTH,
  INQUIRY_PET_ID_REQUIRED_MESSAGE,
  INQUIRY_PET_NOT_AVAILABLE_MESSAGE,
  INQUIRY_PET_NOT_FOUND_MESSAGE,
  canBreederSendInquiryMessage,
  canBuyerSendInquiryMessage,
  getInquiryClosedNotice,
} from "./constants";
import {
  extractPetNameFromInquirySubject,
  formatInquiryDateTime,
  getInquiryMessageSenderLabel,
  getInquiryStatusLabel,
  truncateInquiryMessagePreview,
} from "./format";
import {
  countUnreadBreederMessagesByInquiry,
  countUnreadBuyerMessagesByInquiry,
  findActiveInquiryByBuyerAndPet,
  getInquiryByIdForBreeder,
  getInquiryByIdForBuyer,
  getInquiryBuyerDisplayNamesByIds,
  listBreederPublicNamesByIds,
  listInquiriesForBreeder,
  listInquiriesForBuyer,
  listInquiryMessages,
  listLatestMessagesForInquiries,
  listPetDisplayNamesForBreeder,
  loadInquiryPetSummaryForBreeder,
  loadInquiryPetSummaryForDetail,
  markBreederMessagesAsReadForBuyer,
  markBuyerMessagesAsReadForBreeder,
} from "./repository";
import type {
  BreederInquiriesPageData,
  BreederInquiryDetailPageData,
  BreederInquiryListItem,
  BuyerInquiriesPageData,
  InquiryDetailPageData,
  InquiryListItem,
  InquiryNewPageData,
  InquiryRow,
  InquiryStartUiState,
} from "./types";
import { getVisitIdByInquiryId } from "@/features/visits/repository";
import { resolveInquiryVisitNavigation } from "@/features/visits/constants";
import { isValidInquiryId, isValidInquiryPetId } from "./validation";

export {
  BUYER_INQUIRY_DETAIL_SCREEN_ID,
  BUYER_INQUIRY_LIST_SCREEN_ID,
  BUYER_INQUIRY_NEW_SCREEN_ID,
};

export async function loadInquiryStartUiState(petId: string): Promise<InquiryStartUiState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "guest", href: "/login" };
  }

  if (isAdminUser(user) || parseMemberUserRole(user) !== "buyer") {
    return { status: "hidden" };
  }

  const buyer = await getBuyerProfileByUserId(user.id);

  if (!buyer) {
    return { status: "hidden" };
  }

  if (!buyer.profile_completed) {
    return { status: "profile_incomplete", href: "/buyer/profile" };
  }

  const existing = await findActiveInquiryByBuyerAndPet(buyer.id, petId);

  if (existing) {
    return { status: "existing", href: getBuyerInquiryDetailPath(existing.id) };
  }

  return { status: "new", href: getBuyerInquiryNewPath(petId) };
}

export type LoadInquiryNewPageResult =
  | { success: true; data: InquiryNewPageData }
  | { success: false; notFound: true }
  | { success: false; error: string; petListPath: string };

export async function loadInquiryNewPage(
  petId: string | undefined,
): Promise<LoadInquiryNewPageResult> {
  const normalizedPetId = petId?.trim();

  if (!normalizedPetId) {
    return {
      success: false,
      error: INQUIRY_PET_ID_REQUIRED_MESSAGE,
      petListPath: "/pets",
    };
  }

  if (!isValidInquiryPetId(normalizedPetId)) {
    return { success: false, notFound: true };
  }

  const buyerUser = await getCurrentBuyer();

  if (!buyerUser) {
    redirect(`/login?next=${encodeURIComponent(getBuyerInquiryNewPath(normalizedPetId))}`);
  }

  const buyer = await getBuyerProfileByUserId(buyerUser.id);

  if (!buyer) {
    return { success: false, notFound: true };
  }

  if (!buyer.profile_completed) {
    redirect("/buyer/profile");
  }

  const existing = await findActiveInquiryByBuyerAndPet(buyer.id, normalizedPetId);

  if (existing) {
    redirect(getBuyerInquiryDetailPath(existing.id));
  }

  const detail = await getPublishedPetDetailForPublic(normalizedPetId);

  if (!detail) {
    return { success: false, notFound: true };
  }

  const mainPhoto = detail.photos[0] ?? null;

  return {
    success: true,
    data: {
      petId: normalizedPetId,
      pet: {
        id: detail.id,
        publicDisplayName: detail.publicDisplayName,
        attributeLine: formatPublicPetAttributeLine({
          species: detail.species,
          breed: detail.breed,
          sex: detail.sex,
          birthday: detail.birthday,
        }),
        mainPhotoUrl: mainPhoto?.signedUrl ?? null,
        mainPhotoAlt: mainPhoto?.alt ?? formatPublicPetPhotoAlt(detail.publicDisplayName, 1, 1),
        breederBusinessName: detail.breeder?.businessName ?? null,
      },
    },
  };
}

export function getInquiryNewPageErrorMessage(result: LoadInquiryNewPageResult): string {
  if (result.success) {
    return "";
  }

  if ("notFound" in result && result.notFound) {
    return INQUIRY_PET_NOT_FOUND_MESSAGE;
  }

  if ("error" in result) {
    return result.error || INQUIRY_PET_NOT_AVAILABLE_MESSAGE;
  }

  return INQUIRY_PET_NOT_AVAILABLE_MESSAGE;
}

export function shouldInquiryNewPageNotFound(result: LoadInquiryNewPageResult): boolean {
  return !result.success && "notFound" in result && result.notFound;
}

export type LoadInquiryDetailPageResult =
  { success: true; data: InquiryDetailPageData } | { success: false; notFound: true };

export async function loadInquiryDetailPage(
  inquiryId: string,
): Promise<LoadInquiryDetailPageResult> {
  const normalizedInquiryId = inquiryId.trim();

  if (!isValidInquiryId(normalizedInquiryId)) {
    return { success: false, notFound: true };
  }

  const buyerUser = await getCurrentBuyer();

  if (!buyerUser) {
    redirect(`/login?next=${encodeURIComponent(getBuyerInquiryDetailPath(normalizedInquiryId))}`);
  }

  const buyer = await getBuyerProfileByUserId(buyerUser.id);

  if (!buyer) {
    return { success: false, notFound: true };
  }

  const inquiry = await getInquiryByIdForBuyer(normalizedInquiryId, buyer.id);

  if (!inquiry) {
    return { success: false, notFound: true };
  }

  try {
    await markBreederMessagesAsReadForBuyer(inquiry.id);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("loadInquiryDetailPage mark read failed", error);
    }
  }

  const [petSummary, messageRows, visitId] = await Promise.all([
    loadInquiryPetSummaryForDetail(inquiry),
    listInquiryMessages(inquiry.id),
    getVisitIdByInquiryId(inquiry.id),
  ]);

  const canSendMessage = canBuyerSendInquiryMessage(inquiry.status);
  const closedNotice = getInquiryClosedNotice(inquiry.status);
  const visitNavigation = resolveInquiryVisitNavigation({
    inquiryId: inquiry.id,
    inquiryStatus: inquiry.status,
    visitId,
  });

  return {
    success: true,
    data: {
      summary: {
        inquiryId: inquiry.id,
        status: inquiry.status,
        statusLabel: getInquiryStatusLabel(inquiry.status),
        createdAtLabel: formatInquiryDateTime(inquiry.created_at),
        petId: petSummary.petId,
        publicDisplayName: petSummary.publicDisplayName,
        attributeLine: petSummary.attributeLine,
        mainPhotoUrl: petSummary.mainPhotoUrl,
        mainPhotoAlt: petSummary.mainPhotoAlt,
        breederBusinessName: petSummary.breederBusinessName,
        isPetPubliclyVisible: petSummary.isPetPubliclyVisible,
      },
      messages: messageRows.map((row) => ({
        id: row.id,
        senderLabel: getInquiryMessageSenderLabel(row.sender_type, { viewerRole: "buyer" }),
        senderType: row.sender_type,
        message: row.message,
        createdAt: row.created_at,
        createdAtLabel: formatInquiryDateTime(row.created_at),
        isOwnMessage: row.sender_type === "buyer",
      })),
      canSendMessage,
      closedNotice,
      visitNavigation,
    },
  };
}

function buildInquiryListItem(input: {
  inquiry: InquiryRow;
  publishedPetById: Map<
    string,
    Awaited<ReturnType<typeof listPublishedPetsForPublicByIds>>[number]
  >;
  breederNameById: Map<string, string>;
  latestMessageByInquiryId: Map<string, { message: string }>;
  unreadCountByInquiryId: Map<string, number>;
}): InquiryListItem {
  const {
    inquiry,
    publishedPetById,
    breederNameById,
    latestMessageByInquiryId,
    unreadCountByInquiryId,
  } = input;
  const publishedPet = publishedPetById.get(inquiry.pet_id);
  const subjectName = extractPetNameFromInquirySubject(inquiry.subject);
  const publicDisplayName = publishedPet?.publicDisplayName ?? subjectName ?? "名称未設定";
  const latestMessage = latestMessageByInquiryId.get(inquiry.id);
  const previewSource = latestMessage?.message ?? "";
  const latestMessagePreview = previewSource
    ? truncateInquiryMessagePreview(previewSource, INQUIRY_MESSAGE_PREVIEW_MAX_LENGTH)
    : "メッセージはありません";
  const lastActivityAt = inquiry.last_message_at ?? inquiry.created_at;

  return {
    inquiryId: inquiry.id,
    petId: inquiry.pet_id,
    publicDisplayName,
    mainPhotoUrl: publishedPet?.mainPhotoUrl ?? null,
    mainPhotoAlt: formatPublicPetPhotoAlt(publicDisplayName, 1, 1),
    breederBusinessName:
      publishedPet?.breederBusinessName ?? breederNameById.get(inquiry.breeder_id) ?? null,
    status: inquiry.status,
    statusLabel: getInquiryStatusLabel(inquiry.status),
    lastActivityAtLabel: formatInquiryDateTime(lastActivityAt),
    latestMessagePreview,
    unreadBreederCount: unreadCountByInquiryId.get(inquiry.id) ?? 0,
    detailHref: getBuyerInquiryDetailPath(inquiry.id),
  };
}

export async function loadBuyerInquiriesPageData(): Promise<BuyerInquiriesPageData> {
  const user = await requireBuyer();
  const buyer = await getBuyerProfileByUserId(user.id);

  if (!buyer) {
    return { items: [] };
  }

  try {
    const inquiries = await listInquiriesForBuyer(buyer.id);

    if (inquiries.length === 0) {
      return { items: [] };
    }

    const inquiryIds = inquiries.map((inquiry) => inquiry.id);
    const petIds = [...new Set(inquiries.map((inquiry) => inquiry.pet_id))];
    const breederIds = [...new Set(inquiries.map((inquiry) => inquiry.breeder_id))];

    const [latestMessages, unreadCounts, publishedPets, breederNames] = await Promise.all([
      listLatestMessagesForInquiries(inquiryIds),
      countUnreadBreederMessagesByInquiry(inquiryIds),
      listPublishedPetsForPublicByIds(petIds),
      listBreederPublicNamesByIds(breederIds),
    ]);

    const publishedPetById = new Map(publishedPets.map((pet) => [pet.id, pet]));
    const latestMessageByInquiryId = new Map(
      [...latestMessages.entries()].map(([inquiryId, message]) => [
        inquiryId,
        { message: message.message },
      ]),
    );

    const items = inquiries.map((inquiry) =>
      buildInquiryListItem({
        inquiry,
        publishedPetById,
        breederNameById: breederNames,
        latestMessageByInquiryId,
        unreadCountByInquiryId: unreadCounts,
      }),
    );

    return { items };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("loadBuyerInquiriesPageData failed", error);
    }

    throw new Error(INQUIRY_LIST_LOAD_ERROR_MESSAGE);
  }
}

function buildBreederInquiryListItem(input: {
  inquiry: InquiryRow;
  petNameById: Map<string, string>;
  buyerDisplayNameById: Map<string, string>;
  unreadCountByInquiryId: Map<string, number>;
}): BreederInquiryListItem {
  const { inquiry, petNameById, buyerDisplayNameById, unreadCountByInquiryId } = input;
  const subjectName = extractPetNameFromInquirySubject(inquiry.subject);
  const petName = petNameById.get(inquiry.pet_id) ?? subjectName ?? "名称未設定";
  const buyerDisplayName =
    buyerDisplayNameById.get(inquiry.id) ?? INQUIRY_BUYER_DISPLAY_NAME_FALLBACK;
  const lastActivityAt = inquiry.last_message_at ?? inquiry.created_at;

  return {
    inquiryId: inquiry.id,
    petName,
    buyerDisplayName,
    status: inquiry.status,
    statusLabel: getInquiryStatusLabel(inquiry.status),
    lastActivityAtLabel: formatInquiryDateTime(lastActivityAt),
    unreadBuyerCount: unreadCountByInquiryId.get(inquiry.id) ?? 0,
    detailHref: getBreederInquiryDetailPath(inquiry.id),
  };
}

export async function loadBreederInquiriesPageData(): Promise<BreederInquiriesPageData> {
  const user = await requireBreeder();
  const breederId = await getBreederIdByUserId(user.id);

  if (!breederId) {
    return { items: [] };
  }

  try {
    const inquiries = await listInquiriesForBreeder(breederId);

    if (inquiries.length === 0) {
      return { items: [] };
    }

    const inquiryIds = inquiries.map((inquiry) => inquiry.id);
    const petIds = [...new Set(inquiries.map((inquiry) => inquiry.pet_id))];

    const [unreadCounts, petNames, buyerDisplayNames] = await Promise.all([
      countUnreadBuyerMessagesByInquiry(inquiryIds),
      listPetDisplayNamesForBreeder(breederId, petIds),
      getInquiryBuyerDisplayNamesByIds(inquiryIds),
    ]);

    const items = inquiries.map((inquiry) =>
      buildBreederInquiryListItem({
        inquiry,
        petNameById: petNames,
        buyerDisplayNameById: buyerDisplayNames,
        unreadCountByInquiryId: unreadCounts,
      }),
    );

    return { items };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("loadBreederInquiriesPageData failed", error);
    }

    throw new Error(INQUIRY_BREEDER_LIST_LOAD_ERROR_MESSAGE);
  }
}

export type LoadBreederInquiryDetailPageResult =
  { success: true; data: BreederInquiryDetailPageData } | { success: false; notFound: true };

export async function loadBreederInquiryDetailPage(
  inquiryId: string,
): Promise<LoadBreederInquiryDetailPageResult> {
  const normalizedInquiryId = inquiryId.trim();

  if (!isValidInquiryId(normalizedInquiryId)) {
    return { success: false, notFound: true };
  }

  const user = await requireBreeder();
  const breederId = await getBreederIdByUserId(user.id);

  if (!breederId) {
    return { success: false, notFound: true };
  }

  const inquiry = await getInquiryByIdForBreeder(normalizedInquiryId, breederId);

  if (!inquiry) {
    return { success: false, notFound: true };
  }

  try {
    await markBuyerMessagesAsReadForBreeder(inquiry.id);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("loadBreederInquiryDetailPage mark read failed", error);
    }
  }

  const [petSummary, buyerDisplayNames, messageRows] = await Promise.all([
    loadInquiryPetSummaryForBreeder(inquiry, breederId),
    getInquiryBuyerDisplayNamesByIds([inquiry.id]),
    listInquiryMessages(inquiry.id),
  ]);

  const canSendMessage = canBreederSendInquiryMessage(inquiry.status);
  const closedNotice = getInquiryClosedNotice(inquiry.status);
  const buyerDisplayName = buyerDisplayNames.get(inquiry.id) ?? INQUIRY_BUYER_DISPLAY_NAME_FALLBACK;

  return {
    success: true,
    data: {
      summary: {
        inquiryId: inquiry.id,
        status: inquiry.status,
        statusLabel: getInquiryStatusLabel(inquiry.status),
        createdAtLabel: formatInquiryDateTime(inquiry.created_at),
        petName: petSummary.publicDisplayName,
        attributeLine: petSummary.attributeLine,
        buyerDisplayName,
      },
      messages: messageRows.map((row) => ({
        id: row.id,
        senderLabel: getInquiryMessageSenderLabel(row.sender_type, {
          viewerRole: "breeder",
          buyerDisplayName,
        }),
        senderType: row.sender_type,
        message: row.message,
        createdAt: row.created_at,
        createdAtLabel: formatInquiryDateTime(row.created_at),
        isOwnMessage: row.sender_type === "breeder",
      })),
      canSendMessage,
      closedNotice,
    },
  };
}

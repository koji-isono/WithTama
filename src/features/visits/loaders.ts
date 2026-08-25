import "server-only";

import { redirect } from "next/navigation";

import { getCurrentBuyer, requireBuyer } from "@/features/auth/buyer-auth";
import { requireBreeder, getCurrentBreeder } from "@/features/auth/breeder-auth";
import { getBuyerProfileByUserId } from "@/features/buyers/repository";
import { getBuyerInquiryDetailPath, getBuyerInquiryNewPath } from "@/features/inquiries/constants";
import { INQUIRY_BUYER_DISPLAY_NAME_FALLBACK } from "@/features/inquiries/constants";
import {
  getInquiryStatusLabel,
  extractPetNameFromInquirySubject,
} from "@/features/inquiries/format";
import {
  getInquiryByIdForBuyer,
  getInquiryByIdForBreeder,
  getInquiryBuyerDisplayNamesByIds,
  listBreederPublicNamesByIds,
  listInquiriesByIdsForBuyer,
  listInquiriesByIdsForBreeder,
  loadInquiryPetSummaryForDetail,
  findActiveInquiryByBuyerAndPet,
} from "@/features/inquiries/repository";
import { getPublicPetDetailPath } from "@/features/pets/constants";
import {
  getBreederIdByUserId,
  listPetCardSummariesForBreeder,
  type BreederPetCardSummary,
} from "@/features/pets/repository";
import { isAdminUser, parseMemberUserRole } from "@/features/auth";
import { createClient } from "@/lib/supabase/server";
import type { InquiryRow } from "@/features/inquiries/types";
import { formatPublicPetAttributeLine, formatPublicPetPhotoAlt } from "@/features/pets/list-format";
import { listPublishedPetsForPublicByIds } from "@/features/pets/public-repository";
import { isValidInquiryId } from "@/features/inquiries/validation";

import {
  BUYER_VISIT_DETAIL_SCREEN_ID,
  BUYER_VISIT_LIST_SCREEN_ID,
  BUYER_VISIT_NEW_SCREEN_ID,
  BREEDER_VISIT_LIST_LOAD_ERROR_MESSAGE,
  BREEDER_VISIT_LIST_SCREEN_ID,
  BREEDER_VISIT_DETAIL_SCREEN_ID,
  VISIT_INQUIRY_ID_REQUIRED_MESSAGE,
  VISIT_INQUIRY_NOT_FOUND_MESSAGE,
  VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE,
  VISIT_LIST_LOAD_ERROR_MESSAGE,
  canBreederCancelVisit,
  canBreederCompleteVisit,
  canBreederScheduleVisit,
  isVisitCompleteAllowedNow,
  canBuyerCancelVisit,
  getBreederVisitDetailPath,
  getBuyerVisitDetailPath,
  getBuyerVisitNewPath,
  isVisitRequestEligibleInquiryStatus,
  resolveInquiryVisitNavigation,
} from "./constants";
import {
  formatVisitDateTime,
  formatVisitImplementationFlag,
  formatVisitListPrimaryDateTime,
  getBreederVisitListDateTimeFieldLabel,
  getBreederVisitListStatusHint,
  getBreederVisitStatusLabel,
  getVisitListDateTimeFieldLabel,
  getVisitListStatusHint,
  getVisitResultLabel,
  getVisitStatusLabel,
  sortBreederVisitsForList,
} from "./format";
import {
  findVisitRequestMessage,
  getVisitByIdForBreeder,
  getVisitByIdForBuyer,
  getVisitIdByInquiryId,
  listVisitsForBreeder,
  listVisitsForBuyer,
} from "./repository";
import type {
  BreederVisitListItem,
  BreederVisitDetailPageData,
  BreederVisitsPageData,
  BuyerVisitsPageData,
  VisitDetailPageData,
  VisitListItem,
  VisitRequestPageData,
  VisitRow,
  VisitStartUiState,
} from "./types";

export {
  BUYER_VISIT_NEW_SCREEN_ID,
  BUYER_VISIT_DETAIL_SCREEN_ID,
  BUYER_VISIT_LIST_SCREEN_ID,
  BREEDER_VISIT_LIST_SCREEN_ID,
  BREEDER_VISIT_DETAIL_SCREEN_ID,
};

export async function loadVisitStartUiState(petId: string): Promise<VisitStartUiState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "guest",
      href: `/login?next=${encodeURIComponent(getPublicPetDetailPath(petId))}`,
    };
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

  const inquiry = await findActiveInquiryByBuyerAndPet(buyer.id, petId);

  if (!inquiry) {
    return {
      status: "link",
      href: getBuyerInquiryNewPath(petId),
      label: "見学を希望する",
    };
  }

  const visitId = await getVisitIdByInquiryId(inquiry.id);
  const navigation = resolveInquiryVisitNavigation({
    inquiryId: inquiry.id,
    inquiryStatus: inquiry.status,
    visitId,
  });

  if (navigation.kind === "none") {
    return { status: "hidden" };
  }

  return {
    status: "link",
    href: navigation.href,
    label: navigation.label,
  };
}

export type LoadVisitRequestPageResult =
  | { success: true; data: VisitRequestPageData }
  | { success: false; notFound: true }
  | { success: false; error: string; inquiryDetailPath?: string };

export async function loadVisitRequestPage(
  inquiryId: string | undefined,
): Promise<LoadVisitRequestPageResult> {
  const normalizedInquiryId = inquiryId?.trim();

  if (!normalizedInquiryId) {
    return {
      success: false,
      error: VISIT_INQUIRY_ID_REQUIRED_MESSAGE,
    };
  }

  if (!isValidInquiryId(normalizedInquiryId)) {
    return { success: false, notFound: true };
  }

  const buyerUser = await getCurrentBuyer();

  if (!buyerUser) {
    redirect(`/login?next=${encodeURIComponent(getBuyerVisitNewPath(normalizedInquiryId))}`);
  }

  const buyer = await getBuyerProfileByUserId(buyerUser.id);

  if (!buyer) {
    return { success: false, notFound: true };
  }

  if (!buyer.profile_completed) {
    redirect("/buyer/profile");
  }

  const inquiry = await getInquiryByIdForBuyer(normalizedInquiryId, buyer.id);

  if (!inquiry) {
    return { success: false, notFound: true };
  }

  const existingVisitId = await getVisitIdByInquiryId(inquiry.id);

  if (existingVisitId) {
    redirect(getBuyerVisitDetailPath(existingVisitId));
  }

  if (!isVisitRequestEligibleInquiryStatus(inquiry.status)) {
    return {
      success: false,
      error: VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE,
      inquiryDetailPath: `/buyer/inquiries/${inquiry.id}`,
    };
  }

  const petSummary = await loadInquiryPetSummaryForDetail(inquiry);

  return {
    success: true,
    data: {
      inquiryId: inquiry.id,
      pet: {
        id: petSummary.petId,
        publicDisplayName: petSummary.publicDisplayName,
        attributeLine: petSummary.attributeLine ?? "",
        mainPhotoUrl: petSummary.mainPhotoUrl,
        mainPhotoAlt: petSummary.mainPhotoAlt,
        breederBusinessName: petSummary.breederBusinessName,
        inquiryStatusLabel: getInquiryStatusLabel(inquiry.status),
      },
    },
  };
}

export function shouldVisitRequestPageNotFound(result: LoadVisitRequestPageResult): boolean {
  return !result.success && "notFound" in result && result.notFound;
}

export function getVisitRequestPageErrorMessage(result: LoadVisitRequestPageResult): string {
  if (result.success) {
    return "";
  }

  if ("notFound" in result && result.notFound) {
    return VISIT_INQUIRY_NOT_FOUND_MESSAGE;
  }

  if ("error" in result) {
    return result.error;
  }

  return VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE;
}

export type LoadVisitDetailPageResult =
  { success: true; data: VisitDetailPageData } | { success: false; notFound: true };

export async function loadVisitDetailPage(visitId: string): Promise<LoadVisitDetailPageResult> {
  const normalizedVisitId = visitId.trim();

  if (!isValidInquiryId(normalizedVisitId)) {
    return { success: false, notFound: true };
  }

  const buyerUser = await getCurrentBuyer();

  if (!buyerUser) {
    redirect(`/login?next=${encodeURIComponent(getBuyerVisitDetailPath(normalizedVisitId))}`);
  }

  const buyer = await getBuyerProfileByUserId(buyerUser.id);

  if (!buyer) {
    return { success: false, notFound: true };
  }

  const visit = await getVisitByIdForBuyer(normalizedVisitId, buyer.id);

  if (!visit) {
    return { success: false, notFound: true };
  }

  const inquiry = await getInquiryByIdForBuyer(visit.inquiry_id, buyer.id);

  if (!inquiry) {
    return { success: false, notFound: true };
  }

  const [petSummary, requestMessage] = await Promise.all([
    loadInquiryPetSummaryForDetail(inquiry),
    findVisitRequestMessage(inquiry.id, visit.created_at),
  ]);

  const canCancel = canBuyerCancelVisit(visit.status);

  return {
    success: true,
    data: {
      summary: {
        visitId: visit.id,
        inquiryId: inquiry.id,
        status: visit.status,
        statusLabel: getVisitStatusLabel(visit.status),
        inquiryStatusLabel: getInquiryStatusLabel(inquiry.status),
        petId: petSummary.petId,
        publicDisplayName: petSummary.publicDisplayName,
        attributeLine: petSummary.attributeLine,
        mainPhotoUrl: petSummary.mainPhotoUrl,
        mainPhotoAlt: petSummary.mainPhotoAlt,
        breederBusinessName: petSummary.breederBusinessName,
        requestedAtLabel: formatVisitDateTime(visit.requested_at) ?? "—",
        requestedAtSecondLabel: formatVisitDateTime(visit.requested_at_second),
        requestedAtThirdLabel: formatVisitDateTime(visit.requested_at_third),
        scheduledAtLabel: formatVisitDateTime(visit.scheduled_at),
        createdAtLabel: formatVisitDateTime(visit.created_at) ?? "—",
        completedAtLabel: formatVisitDateTime(visit.completed_at),
        canceledAtLabel: formatVisitDateTime(visit.canceled_at),
        cancellationReason: visit.cancellation_reason,
        resultLabel: visit.status === "completed" ? getVisitResultLabel(visit.result) : null,
        animalConfirmedLabel:
          visit.status === "completed"
            ? formatVisitImplementationFlag(visit.animal_confirmed)
            : null,
        explanationCompletedLabel:
          visit.status === "completed"
            ? formatVisitImplementationFlag(visit.explanation_completed)
            : null,
        requestMessage,
      },
      canCancel,
    },
  };
}

function buildVisitListItem(input: {
  visit: VisitRow;
  inquiry: InquiryRow;
  publishedPetById: Map<
    string,
    Awaited<ReturnType<typeof listPublishedPetsForPublicByIds>>[number]
  >;
  breederNameById: Map<string, string>;
}): VisitListItem {
  const { visit, inquiry, publishedPetById, breederNameById } = input;
  const publishedPet = publishedPetById.get(inquiry.pet_id);
  const subjectName = extractPetNameFromInquirySubject(inquiry.subject);
  const publicDisplayName = publishedPet?.publicDisplayName ?? subjectName ?? "名称未設定";

  return {
    visitId: visit.id,
    inquiryId: inquiry.id,
    status: visit.status,
    statusLabel: getVisitStatusLabel(visit.status),
    statusHint: getVisitListStatusHint(visit.status),
    inquiryStatusLabel: getInquiryStatusLabel(inquiry.status),
    publicDisplayName,
    attributeLine: publishedPet
      ? formatPublicPetAttributeLine({
          species: publishedPet.species,
          breed: publishedPet.breed,
          sex: publishedPet.sex,
          birthday: publishedPet.birthday,
        })
      : null,
    mainPhotoUrl: publishedPet?.mainPhotoUrl ?? null,
    mainPhotoAlt: formatPublicPetPhotoAlt(publicDisplayName, 1, 1),
    breederBusinessName:
      publishedPet?.breederBusinessName ?? breederNameById.get(inquiry.breeder_id) ?? null,
    dateTimeFieldLabel: getVisitListDateTimeFieldLabel(visit.status),
    dateTimeLabel: formatVisitListPrimaryDateTime(visit),
    detailHref: getBuyerVisitDetailPath(visit.id),
    inquiryDetailHref: getBuyerInquiryDetailPath(inquiry.id),
  };
}

export async function loadBuyerVisitsPageData(): Promise<BuyerVisitsPageData> {
  const user = await requireBuyer();
  const buyer = await getBuyerProfileByUserId(user.id);

  if (!buyer) {
    return { items: [] };
  }

  try {
    const visits = await listVisitsForBuyer(buyer.id);

    if (visits.length === 0) {
      return { items: [] };
    }

    const inquiryIds = [...new Set(visits.map((visit) => visit.inquiry_id))];
    const inquiries = await listInquiriesByIdsForBuyer(buyer.id, inquiryIds);
    const inquiryById = new Map(inquiries.map((inquiry) => [inquiry.id, inquiry]));

    const petIds = [...new Set(inquiries.map((inquiry) => inquiry.pet_id))];
    const breederIds = [...new Set(inquiries.map((inquiry) => inquiry.breeder_id))];

    const [publishedPets, breederNames] = await Promise.all([
      listPublishedPetsForPublicByIds(petIds),
      listBreederPublicNamesByIds(breederIds),
    ]);

    const publishedPetById = new Map(publishedPets.map((pet) => [pet.id, pet]));

    const items = visits
      .map((visit) => {
        const inquiry = inquiryById.get(visit.inquiry_id);

        if (!inquiry) {
          return null;
        }

        return buildVisitListItem({
          visit,
          inquiry,
          publishedPetById,
          breederNameById: breederNames,
        });
      })
      .filter((item): item is VisitListItem => item !== null);

    return { items };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("loadBuyerVisitsPageData failed", error);
    }

    throw new Error(VISIT_LIST_LOAD_ERROR_MESSAGE);
  }
}

function buildBreederVisitListItem(input: {
  visit: VisitRow;
  inquiry: InquiryRow;
  petSummaryById: Map<string, BreederPetCardSummary>;
  buyerDisplayNameByInquiryId: Map<string, string>;
}): BreederVisitListItem {
  const { visit, inquiry, petSummaryById, buyerDisplayNameByInquiryId } = input;
  const petSummary = petSummaryById.get(visit.pet_id);
  const subjectName = extractPetNameFromInquirySubject(inquiry.subject);
  const publicDisplayName = petSummary?.publicDisplayName ?? subjectName ?? "名称未設定";

  return {
    visitId: visit.id,
    inquiryId: inquiry.id,
    status: visit.status,
    statusLabel: getBreederVisitStatusLabel(visit.status),
    statusHint: getBreederVisitListStatusHint(visit.status),
    inquiryStatusLabel: getInquiryStatusLabel(inquiry.status),
    publicDisplayName,
    attributeLine: petSummary?.attributeLine ?? null,
    mainPhotoUrl: petSummary?.mainPhotoUrl ?? null,
    mainPhotoAlt: formatPublicPetPhotoAlt(publicDisplayName, 1, 1),
    buyerDisplayName:
      buyerDisplayNameByInquiryId.get(inquiry.id) ?? INQUIRY_BUYER_DISPLAY_NAME_FALLBACK,
    dateTimeFieldLabel: getBreederVisitListDateTimeFieldLabel(visit.status),
    dateTimeLabel: formatVisitListPrimaryDateTime(visit),
    detailHref: getBreederVisitDetailPath(visit.id),
  };
}

export async function loadBreederVisitsPageData(): Promise<BreederVisitsPageData> {
  const user = await requireBreeder();
  const breederId = await getBreederIdByUserId(user.id);

  if (!breederId) {
    return { items: [] };
  }

  try {
    const visits = sortBreederVisitsForList(await listVisitsForBreeder(breederId));

    if (visits.length === 0) {
      return { items: [] };
    }

    const inquiryIds = [...new Set(visits.map((visit) => visit.inquiry_id))];
    const petIds = [...new Set(visits.map((visit) => visit.pet_id))];

    const [inquiries, petSummaries, buyerDisplayNames] = await Promise.all([
      listInquiriesByIdsForBreeder(breederId, inquiryIds),
      listPetCardSummariesForBreeder(breederId, petIds),
      getInquiryBuyerDisplayNamesByIds(inquiryIds),
    ]);

    const inquiryById = new Map(inquiries.map((inquiry) => [inquiry.id, inquiry]));

    const items = visits
      .map((visit) => {
        const inquiry = inquiryById.get(visit.inquiry_id);

        if (!inquiry) {
          return null;
        }

        return buildBreederVisitListItem({
          visit,
          inquiry,
          petSummaryById: petSummaries,
          buyerDisplayNameByInquiryId: buyerDisplayNames,
        });
      })
      .filter((item): item is BreederVisitListItem => item !== null);

    return { items };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("loadBreederVisitsPageData failed", error);
    }

    throw new Error(BREEDER_VISIT_LIST_LOAD_ERROR_MESSAGE);
  }
}

export type LoadBreederVisitDetailPageResult =
  { success: true; data: BreederVisitDetailPageData } | { success: false; notFound: true };

export async function loadBreederVisitDetailPage(
  visitId: string,
): Promise<LoadBreederVisitDetailPageResult> {
  const normalizedVisitId = visitId.trim();

  if (!isValidInquiryId(normalizedVisitId)) {
    return { success: false, notFound: true };
  }

  const breederUser = await getCurrentBreeder();

  if (!breederUser) {
    redirect(`/login?next=${encodeURIComponent(getBreederVisitDetailPath(normalizedVisitId))}`);
  }

  const breederId = await getBreederIdByUserId(breederUser.id);

  if (!breederId) {
    return { success: false, notFound: true };
  }

  const visit = await getVisitByIdForBreeder(normalizedVisitId, breederId);

  if (!visit) {
    return { success: false, notFound: true };
  }

  const inquiry = await getInquiryByIdForBreeder(visit.inquiry_id, breederId);

  if (!inquiry) {
    return { success: false, notFound: true };
  }

  const [petSummaries, buyerDisplayNames, requestMessage] = await Promise.all([
    listPetCardSummariesForBreeder(breederId, [visit.pet_id]),
    getInquiryBuyerDisplayNamesByIds([inquiry.id]),
    findVisitRequestMessage(inquiry.id, visit.created_at),
  ]);

  const petSummary = petSummaries.get(visit.pet_id);
  const subjectName = extractPetNameFromInquirySubject(inquiry.subject);
  const publicDisplayName = petSummary?.publicDisplayName ?? subjectName ?? "名称未設定";
  const buyerDisplayName = buyerDisplayNames.get(inquiry.id) ?? INQUIRY_BUYER_DISPLAY_NAME_FALLBACK;

  return {
    success: true,
    data: {
      summary: {
        visitId: visit.id,
        inquiryId: inquiry.id,
        status: visit.status,
        statusLabel: getBreederVisitStatusLabel(visit.status),
        inquiryStatusLabel: getInquiryStatusLabel(inquiry.status),
        petId: visit.pet_id,
        publicDisplayName,
        attributeLine: petSummary?.attributeLine ?? null,
        mainPhotoUrl: petSummary?.mainPhotoUrl ?? null,
        mainPhotoAlt: formatPublicPetPhotoAlt(publicDisplayName, 1, 1),
        buyerDisplayName,
        requestedAtLabel: formatVisitDateTime(visit.requested_at) ?? "—",
        requestedAtSecondLabel: formatVisitDateTime(visit.requested_at_second),
        requestedAtThirdLabel: formatVisitDateTime(visit.requested_at_third),
        scheduledAtLabel: formatVisitDateTime(visit.scheduled_at),
        inquiryCreatedAtLabel: formatVisitDateTime(inquiry.created_at) ?? "—",
        createdAtLabel: formatVisitDateTime(visit.created_at) ?? "—",
        completedAtLabel: formatVisitDateTime(visit.completed_at),
        canceledAtLabel: formatVisitDateTime(visit.canceled_at),
        cancellationReason: visit.cancellation_reason,
        resultLabel: visit.status === "completed" ? getVisitResultLabel(visit.result) : null,
        animalConfirmedLabel:
          visit.status === "completed"
            ? formatVisitImplementationFlag(visit.animal_confirmed)
            : null,
        explanationCompletedLabel:
          visit.status === "completed"
            ? formatVisitImplementationFlag(visit.explanation_completed)
            : null,
        breederNote: visit.breeder_note,
        requestMessage,
      },
      canSchedule: canBreederScheduleVisit(visit.status),
      canComplete: canBreederCompleteVisit(visit.status),
      canCompleteNow:
        canBreederCompleteVisit(visit.status) && isVisitCompleteAllowedNow(visit.scheduled_at),
      canCancel: canBreederCancelVisit(visit.status),
    },
  };
}

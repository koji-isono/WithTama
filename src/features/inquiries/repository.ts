import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPublishedPetDetailForPublic } from "@/features/pets/public-repository";
import { formatPublicPetAttributeLine, formatPublicPetPhotoAlt } from "@/features/pets/list-format";

import { ACTIVE_INQUIRY_STATUSES, INQUIRY_LIST_MAX_ITEMS } from "./constants";
import { extractPetNameFromInquirySubject } from "./format";
import type { InquiryMessageRow, InquiryRow, PublishedPetInquiryContextRow } from "./types";

const inquiryIdSelect =
  "id, buyer_id, breeder_id, pet_id, status, subject, last_message_at, deleted_at, created_at";

const inquiryMessageSelect =
  "id, inquiry_id, sender_type, sender_user_id, message, is_read, read_at, created_at";

export async function getPublishedPetInquiryContext(
  petId: string,
): Promise<PublishedPetInquiryContextRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("published_pet_detail_public")
    .select("id, breeder_id, public_display_name")
    .eq("id", petId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PublishedPetInquiryContextRow | null;
}

export async function isPublishedPetListable(petId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("published_pets_public")
    .select("id")
    .eq("id", petId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data != null;
}

export async function findActiveInquiriesByBuyerAndPet(
  buyerId: string,
  petId: string,
): Promise<InquiryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiries")
    .select(inquiryIdSelect)
    .eq("buyer_id", buyerId)
    .eq("pet_id", petId)
    .is("deleted_at", null)
    .in("status", [...ACTIVE_INQUIRY_STATUSES])
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as InquiryRow[];
}

export async function findActiveInquiryByBuyerAndPet(
  buyerId: string,
  petId: string,
): Promise<InquiryRow | null> {
  const inquiries = await findActiveInquiriesByBuyerAndPet(buyerId, petId);

  return inquiries[0] ?? null;
}

export async function insertInquiry(input: {
  buyerId: string;
  breederId: string;
  petId: string;
  subject: string;
}): Promise<InquiryRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      buyer_id: input.buyerId,
      breeder_id: input.breederId,
      pet_id: input.petId,
      subject: input.subject,
      status: "open",
    })
    .select(inquiryIdSelect)
    .single();

  if (error) {
    throw error;
  }

  return data as InquiryRow;
}

export async function insertInquiryMessage(input: {
  inquiryId: string;
  senderUserId: string;
  message: string;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("inquiry_messages").insert({
    inquiry_id: input.inquiryId,
    sender_type: "buyer",
    sender_user_id: input.senderUserId,
    message: input.message,
  });

  if (error) {
    throw error;
  }
}

export async function updateInquiryLastMessageAt(inquiryId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inquiries")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", inquiryId);

  if (error) {
    throw error;
  }
}

export async function softDeleteInquiry(inquiryId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("inquiries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", inquiryId);

  if (error) {
    throw error;
  }
}

export async function getInquiryByIdForBuyer(
  inquiryId: string,
  buyerId: string,
): Promise<InquiryRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiries")
    .select(inquiryIdSelect)
    .eq("id", inquiryId)
    .eq("buyer_id", buyerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as InquiryRow | null;
}

export async function listInquiryMessages(inquiryId: string): Promise<InquiryMessageRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiry_messages")
    .select(inquiryMessageSelect)
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as InquiryMessageRow[];
}

export async function markBreederMessagesAsReadForBuyer(inquiryId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("inquiry_messages")
    .update({
      is_read: true,
      read_at: now,
    })
    .eq("inquiry_id", inquiryId)
    .eq("sender_type", "breeder")
    .eq("is_read", false);

  if (error) {
    throw error;
  }
}

export type InquiryPetSummaryForDetail = {
  petId: string;
  publicDisplayName: string;
  attributeLine: string | null;
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  breederBusinessName: string | null;
  isPetPubliclyVisible: boolean;
};

export async function loadInquiryPetSummaryForDetail(
  inquiry: InquiryRow,
): Promise<InquiryPetSummaryForDetail> {
  const publishedDetail = await getPublishedPetDetailForPublic(inquiry.pet_id);

  if (publishedDetail) {
    const mainPhoto = publishedDetail.photos[0] ?? null;

    return {
      petId: inquiry.pet_id,
      publicDisplayName: publishedDetail.publicDisplayName,
      attributeLine: formatPublicPetAttributeLine({
        species: publishedDetail.species,
        breed: publishedDetail.breed,
        sex: publishedDetail.sex,
        birthday: publishedDetail.birthday,
      }),
      mainPhotoUrl: mainPhoto?.signedUrl ?? null,
      mainPhotoAlt:
        mainPhoto?.alt ?? formatPublicPetPhotoAlt(publishedDetail.publicDisplayName, 1, 1),
      breederBusinessName: publishedDetail.breeder?.businessName ?? null,
      isPetPubliclyVisible: true,
    };
  }

  const supabase = await createClient();
  const subjectName = extractPetNameFromInquirySubject(inquiry.subject);
  const publicDisplayName = subjectName ?? "名称未設定";

  const { data: breederRow } = await supabase
    .from("breeder_public_profiles")
    .select("business_name")
    .eq("id", inquiry.breeder_id)
    .maybeSingle();

  return {
    petId: inquiry.pet_id,
    publicDisplayName,
    attributeLine: null,
    mainPhotoUrl: null,
    mainPhotoAlt: formatPublicPetPhotoAlt(publicDisplayName, 1, 1),
    breederBusinessName: (breederRow?.business_name as string | null) ?? null,
    isPetPubliclyVisible: false,
  };
}

export async function listInquiriesForBuyer(
  buyerId: string,
  limit = INQUIRY_LIST_MAX_ITEMS,
): Promise<InquiryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiries")
    .select(inquiryIdSelect)
    .eq("buyer_id", buyerId)
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as InquiryRow[];
}

export async function listLatestMessagesForInquiries(
  inquiryIds: string[],
): Promise<Map<string, InquiryMessageRow>> {
  if (inquiryIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiry_messages")
    .select(inquiryMessageSelect)
    .in("inquiry_id", inquiryIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const latestByInquiry = new Map<string, InquiryMessageRow>();

  for (const row of data ?? []) {
    const message = row as InquiryMessageRow;

    if (!latestByInquiry.has(message.inquiry_id)) {
      latestByInquiry.set(message.inquiry_id, message);
    }
  }

  return latestByInquiry;
}

export async function countUnreadBreederMessagesByInquiry(
  inquiryIds: string[],
): Promise<Map<string, number>> {
  if (inquiryIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiry_messages")
    .select("inquiry_id")
    .in("inquiry_id", inquiryIds)
    .eq("sender_type", "breeder")
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    const inquiryId = row.inquiry_id as string;
    counts.set(inquiryId, (counts.get(inquiryId) ?? 0) + 1);
  }

  return counts;
}

export async function listBreederPublicNamesByIds(
  breederIds: string[],
): Promise<Map<string, string>> {
  if (breederIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeder_public_profiles")
    .select("id, business_name")
    .in("id", breederIds);

  if (error) {
    throw error;
  }

  const names = new Map<string, string>();

  for (const row of data ?? []) {
    const businessName = row.business_name as string | null;

    if (businessName?.trim()) {
      names.set(row.id as string, businessName.trim());
    }
  }

  return names;
}

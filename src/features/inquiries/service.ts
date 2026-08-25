"use server";

import { isAdminUser, parseMemberUserRole } from "@/features/auth";
import { getBuyerProfileByUserId } from "@/features/buyers/repository";
import { getBreederIdByUserId } from "@/features/pets/repository";
import { createClient } from "@/lib/supabase/server";

import {
  buildInquirySubject,
  canBreederSendInquiryMessage,
  canBuyerSendInquiryMessage,
  INQUIRY_BREEDER_FORBIDDEN_MESSAGE,
  INQUIRY_BREEDER_NOT_FOUND_MESSAGE,
  INQUIRY_BUYER_NOT_FOUND_MESSAGE,
  INQUIRY_FORBIDDEN_ROLE_MESSAGE,
  INQUIRY_INQUIRY_CREATE_ERROR_MESSAGE,
  INQUIRY_MESSAGE_CREATE_ERROR_MESSAGE,
  INQUIRY_NOT_FOUND_MESSAGE,
  INQUIRY_PET_ID_REQUIRED_MESSAGE,
  INQUIRY_PET_NOT_AVAILABLE_MESSAGE,
  INQUIRY_REPLY_NOT_ALLOWED_MESSAGE,
  INQUIRY_SUBMIT_ERROR_MESSAGE,
  INQUIRY_UNAUTHORIZED_MESSAGE,
} from "./constants";
import {
  findActiveInquiriesByBuyerAndPet,
  findActiveInquiryByBuyerAndPet,
  getInquiryByIdForBreeder,
  getInquiryByIdForBuyer,
  getPublishedPetInquiryContext,
  insertInquiry,
  insertInquiryMessage,
  isPublishedPetListable,
  softDeleteInquiry,
  updateInquiryLastMessageAt,
  updateInquiryStatusToReplied,
} from "./repository";
import type {
  CreateInquiryActionResult,
  SendBreederInquiryMessageActionResult,
  SendInquiryMessageActionResult,
} from "./types";
import {
  hasInquiryMessageValidationErrors,
  isValidInquiryId,
  normalizeInquiryMessage,
  validateInquiryMessage,
} from "./validation";

type ResolvedBuyerContext =
  | { success: true; buyerId: string; userId: string; profileCompleted: boolean }
  | { success: false; error: string };

async function resolveBuyerContextForInquiry(): Promise<ResolvedBuyerContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: INQUIRY_UNAUTHORIZED_MESSAGE };
  }

  if (isAdminUser(user)) {
    return { success: false, error: INQUIRY_FORBIDDEN_ROLE_MESSAGE };
  }

  const role = parseMemberUserRole(user);

  if (role !== "buyer") {
    return { success: false, error: INQUIRY_FORBIDDEN_ROLE_MESSAGE };
  }

  const buyer = await getBuyerProfileByUserId(user.id);

  if (!buyer) {
    return { success: false, error: INQUIRY_BUYER_NOT_FOUND_MESSAGE };
  }

  return {
    success: true,
    buyerId: buyer.id,
    userId: user.id,
    profileCompleted: buyer.profile_completed,
  };
}

export async function createInquiryAction(
  petId: string,
  message: string,
): Promise<CreateInquiryActionResult> {
  const normalizedPetId = petId.trim();

  if (!normalizedPetId) {
    return { success: false, error: INQUIRY_PET_ID_REQUIRED_MESSAGE };
  }

  const fieldErrors = validateInquiryMessage(message);

  if (hasInquiryMessageValidationErrors(fieldErrors)) {
    return {
      success: false,
      error: fieldErrors.message ?? INQUIRY_SUBMIT_ERROR_MESSAGE,
      fieldErrors,
    };
  }

  const buyerContext = await resolveBuyerContextForInquiry();

  if (!buyerContext.success) {
    return { success: false, error: buyerContext.error };
  }

  if (!buyerContext.profileCompleted) {
    return {
      success: false,
      error: "プロフィール登録を完了してください。",
      redirectTo: "/buyer/profile",
    };
  }

  const existingBeforeCreate = await findActiveInquiryByBuyerAndPet(
    buyerContext.buyerId,
    normalizedPetId,
  );

  if (existingBeforeCreate) {
    return { success: true, inquiryId: existingBeforeCreate.id };
  }

  let petContext;

  try {
    petContext = await getPublishedPetInquiryContext(normalizedPetId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("createInquiryAction pet lookup failed", error);
    }

    return { success: false, error: INQUIRY_SUBMIT_ERROR_MESSAGE };
  }

  if (!petContext) {
    return { success: false, error: INQUIRY_PET_NOT_AVAILABLE_MESSAGE };
  }

  const listable = await isPublishedPetListable(normalizedPetId);

  if (!listable) {
    return { success: false, error: INQUIRY_PET_NOT_AVAILABLE_MESSAGE };
  }

  const normalizedMessage = normalizeInquiryMessage(message);
  const subject = buildInquirySubject(petContext.public_display_name);

  let inquiry;

  try {
    inquiry = await insertInquiry({
      buyerId: buyerContext.buyerId,
      breederId: petContext.breeder_id,
      petId: normalizedPetId,
      subject,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("createInquiryAction inquiry insert failed", error);
    }

    const racedExisting = await findActiveInquiryByBuyerAndPet(
      buyerContext.buyerId,
      normalizedPetId,
    );

    if (racedExisting) {
      return { success: true, inquiryId: racedExisting.id };
    }

    return { success: false, error: INQUIRY_INQUIRY_CREATE_ERROR_MESSAGE };
  }

  try {
    await insertInquiryMessage({
      inquiryId: inquiry.id,
      senderUserId: buyerContext.userId,
      senderType: "buyer",
      message: normalizedMessage,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("createInquiryAction message insert failed", error);
    }

    try {
      await softDeleteInquiry(inquiry.id);
    } catch (rollbackError) {
      if (process.env.NODE_ENV === "development") {
        console.error("createInquiryAction rollback failed", rollbackError);
      }
    }

    return { success: false, error: INQUIRY_MESSAGE_CREATE_ERROR_MESSAGE };
  }

  try {
    await updateInquiryLastMessageAt(inquiry.id);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("createInquiryAction last_message_at update failed", error);
    }

    return { success: false, error: INQUIRY_SUBMIT_ERROR_MESSAGE };
  }

  const activeInquiries = await findActiveInquiriesByBuyerAndPet(
    buyerContext.buyerId,
    normalizedPetId,
  );

  if (activeInquiries.length > 1) {
    const canonical = activeInquiries[0];

    if (canonical && canonical.id !== inquiry.id) {
      try {
        await softDeleteInquiry(inquiry.id);
      } catch (rollbackError) {
        if (process.env.NODE_ENV === "development") {
          console.error("createInquiryAction duplicate rollback failed", rollbackError);
        }
      }

      return { success: true, inquiryId: canonical.id };
    }
  }

  return { success: true, inquiryId: inquiry.id };
}

export async function sendInquiryMessageAction(
  inquiryId: string,
  message: string,
): Promise<SendInquiryMessageActionResult> {
  const normalizedInquiryId = inquiryId.trim();

  if (!isValidInquiryId(normalizedInquiryId)) {
    return { success: false, error: INQUIRY_NOT_FOUND_MESSAGE };
  }

  const fieldErrors = validateInquiryMessage(message);

  if (hasInquiryMessageValidationErrors(fieldErrors)) {
    return {
      success: false,
      error: fieldErrors.message ?? INQUIRY_SUBMIT_ERROR_MESSAGE,
      fieldErrors,
    };
  }

  const buyerContext = await resolveBuyerContextForInquiry();

  if (!buyerContext.success) {
    return { success: false, error: buyerContext.error };
  }

  const inquiry = await getInquiryByIdForBuyer(normalizedInquiryId, buyerContext.buyerId);

  if (!inquiry) {
    return { success: false, error: INQUIRY_NOT_FOUND_MESSAGE };
  }

  if (!canBuyerSendInquiryMessage(inquiry.status)) {
    return { success: false, error: INQUIRY_REPLY_NOT_ALLOWED_MESSAGE };
  }

  const normalizedMessage = normalizeInquiryMessage(message);

  try {
    await insertInquiryMessage({
      inquiryId: inquiry.id,
      senderUserId: buyerContext.userId,
      senderType: "buyer",
      message: normalizedMessage,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("sendInquiryMessageAction insert failed", error);
    }

    return { success: false, error: INQUIRY_MESSAGE_CREATE_ERROR_MESSAGE };
  }

  try {
    await updateInquiryLastMessageAt(inquiry.id);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("sendInquiryMessageAction last_message_at update failed", error);
    }

    return { success: false, error: INQUIRY_SUBMIT_ERROR_MESSAGE };
  }

  return { success: true };
}

type ResolvedBreederContext =
  { success: true; breederId: string; userId: string } | { success: false; error: string };

async function resolveBreederContextForInquiry(): Promise<ResolvedBreederContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: INQUIRY_UNAUTHORIZED_MESSAGE };
  }

  if (isAdminUser(user)) {
    return { success: false, error: INQUIRY_BREEDER_FORBIDDEN_MESSAGE };
  }

  const role = parseMemberUserRole(user);

  if (role !== "breeder") {
    return { success: false, error: INQUIRY_BREEDER_FORBIDDEN_MESSAGE };
  }

  const breederId = await getBreederIdByUserId(user.id);

  if (!breederId) {
    return { success: false, error: INQUIRY_BREEDER_NOT_FOUND_MESSAGE };
  }

  return {
    success: true,
    breederId,
    userId: user.id,
  };
}

export async function sendBreederInquiryMessageAction(
  inquiryId: string,
  message: string,
): Promise<SendBreederInquiryMessageActionResult> {
  const normalizedInquiryId = inquiryId.trim();

  if (!isValidInquiryId(normalizedInquiryId)) {
    return { success: false, error: INQUIRY_NOT_FOUND_MESSAGE };
  }

  const fieldErrors = validateInquiryMessage(message);

  if (hasInquiryMessageValidationErrors(fieldErrors)) {
    return {
      success: false,
      error: fieldErrors.message ?? INQUIRY_SUBMIT_ERROR_MESSAGE,
      fieldErrors,
    };
  }

  const breederContext = await resolveBreederContextForInquiry();

  if (!breederContext.success) {
    return { success: false, error: breederContext.error };
  }

  const inquiry = await getInquiryByIdForBreeder(normalizedInquiryId, breederContext.breederId);

  if (!inquiry) {
    return { success: false, error: INQUIRY_NOT_FOUND_MESSAGE };
  }

  if (!canBreederSendInquiryMessage(inquiry.status)) {
    return { success: false, error: INQUIRY_REPLY_NOT_ALLOWED_MESSAGE };
  }

  const normalizedMessage = normalizeInquiryMessage(message);

  try {
    await insertInquiryMessage({
      inquiryId: inquiry.id,
      senderUserId: breederContext.userId,
      senderType: "breeder",
      message: normalizedMessage,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("sendBreederInquiryMessageAction insert failed", error);
    }

    return { success: false, error: INQUIRY_MESSAGE_CREATE_ERROR_MESSAGE };
  }

  try {
    await updateInquiryLastMessageAt(inquiry.id);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("sendBreederInquiryMessageAction last_message_at update failed", error);
    }

    return { success: false, error: INQUIRY_SUBMIT_ERROR_MESSAGE };
  }

  if (inquiry.status === "open") {
    try {
      await updateInquiryStatusToReplied(inquiry.id);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("sendBreederInquiryMessageAction status update failed", error);
      }

      return { success: false, error: INQUIRY_SUBMIT_ERROR_MESSAGE };
    }
  }

  return { success: true };
}

"use server";

import { isAdminUser, parseMemberUserRole } from "@/features/auth";
import { getBuyerProfileByUserId } from "@/features/buyers/repository";
import { getInquiryByIdForBuyer } from "@/features/inquiries/repository";
import { isValidInquiryId } from "@/features/inquiries/validation";
import { getBreederIdByUserId } from "@/features/pets/repository";
import { createClient } from "@/lib/supabase/server";

import {
  VISIT_ALREADY_EXISTS_MESSAGE,
  VISIT_BREEDER_FORBIDDEN_ROLE_MESSAGE,
  VISIT_BREEDER_NOT_FOUND_MESSAGE,
  VISIT_BREEDER_UNAUTHORIZED_MESSAGE,
  VISIT_BUYER_NOT_FOUND_MESSAGE,
  VISIT_CANNOT_CANCEL_MESSAGE,
  VISIT_CANNOT_COMPLETE_MESSAGE,
  VISIT_CANNOT_SCHEDULE_MESSAGE,
  VISIT_FORBIDDEN_ROLE_MESSAGE,
  VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE,
  VISIT_INQUIRY_NOT_FOUND_MESSAGE,
  VISIT_PROFILE_INCOMPLETE_MESSAGE,
  VISIT_SCHEDULE_DATETIME_REQUIRED_MESSAGE,
  VISIT_SCHEDULE_ERROR_MESSAGE,
  VISIT_COMPLETE_ERROR_MESSAGE,
  VISIT_SUBMIT_ERROR_MESSAGE,
  VISIT_UNAUTHORIZED_MESSAGE,
  canBreederCancelVisit,
  canBreederCompleteVisit,
  canBreederScheduleVisit,
  canBuyerCancelVisit,
  getBuyerVisitDetailPath,
  isVisitRequestEligibleInquiryStatus,
} from "./constants";
import { datetimeLocalToIso } from "./datetime";
import {
  mapCancelVisitRpcError,
  mapCompleteVisitRpcError,
  mapRequestVisitRpcError,
  mapScheduleVisitRpcError,
} from "./errors";
import {
  cancelVisitViaRpc,
  completeVisitViaRpc,
  getVisitByIdForBreeder,
  getVisitByIdForBuyer,
  getVisitIdByInquiryId,
  requestVisitViaRpc,
  scheduleVisitViaRpc,
} from "./repository";
import type {
  CancelVisitActionResult,
  CompleteVisitActionResult,
  CompleteVisitFormInput,
  RequestVisitActionResult,
  ScheduleVisitActionResult,
  ScheduleVisitFormInput,
  VisitRequestFormInput,
} from "./types";
import {
  hasCompleteVisitValidationErrors,
  hasVisitRequestValidationErrors,
  normalizeVisitRequestMessage,
  validateCancellationReason,
  validateCompleteVisitForm,
  validateScheduleVisitForm,
  validateVisitRequestForm,
} from "./validation";

type ResolvedBuyerContext =
  { success: true; buyerId: string; profileCompleted: boolean } | { success: false; error: string };

async function resolveBuyerContextForVisit(): Promise<ResolvedBuyerContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: VISIT_UNAUTHORIZED_MESSAGE };
  }

  if (isAdminUser(user)) {
    return { success: false, error: VISIT_FORBIDDEN_ROLE_MESSAGE };
  }

  const role = parseMemberUserRole(user);

  if (role !== "buyer") {
    return { success: false, error: VISIT_FORBIDDEN_ROLE_MESSAGE };
  }

  const buyer = await getBuyerProfileByUserId(user.id);

  if (!buyer) {
    return { success: false, error: VISIT_BUYER_NOT_FOUND_MESSAGE };
  }

  return {
    success: true,
    buyerId: buyer.id,
    profileCompleted: buyer.profile_completed,
  };
}

export async function requestVisitAction(
  input: VisitRequestFormInput,
): Promise<RequestVisitActionResult> {
  const normalizedInquiryId = input.inquiryId.trim();

  if (!isValidInquiryId(normalizedInquiryId)) {
    return { success: false, error: VISIT_INQUIRY_NOT_FOUND_MESSAGE };
  }

  const fieldErrors = validateVisitRequestForm(input);

  if (hasVisitRequestValidationErrors(fieldErrors)) {
    const firstError =
      fieldErrors.requestedAt ??
      fieldErrors.requestedAtSecond ??
      fieldErrors.requestedAtThird ??
      fieldErrors.message ??
      VISIT_SUBMIT_ERROR_MESSAGE;

    return {
      success: false,
      error: firstError,
      fieldErrors,
    };
  }

  const buyerContext = await resolveBuyerContextForVisit();

  if (!buyerContext.success) {
    return { success: false, error: buyerContext.error };
  }

  if (!buyerContext.profileCompleted) {
    return {
      success: false,
      error: VISIT_PROFILE_INCOMPLETE_MESSAGE,
      redirectTo: "/buyer/profile",
    };
  }

  const inquiry = await getInquiryByIdForBuyer(normalizedInquiryId, buyerContext.buyerId);

  if (!inquiry) {
    return { success: false, error: VISIT_INQUIRY_NOT_FOUND_MESSAGE };
  }

  if (!isVisitRequestEligibleInquiryStatus(inquiry.status)) {
    return { success: false, error: VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE };
  }

  const existingVisitId = await getVisitIdByInquiryId(inquiry.id);

  if (existingVisitId) {
    return {
      success: false,
      error: VISIT_ALREADY_EXISTS_MESSAGE,
      redirectTo: getBuyerVisitDetailPath(existingVisitId),
    };
  }

  const requestedAtIso = datetimeLocalToIso(input.requestedAt);
  const requestedAtSecondIso = input.requestedAtSecond.trim()
    ? datetimeLocalToIso(input.requestedAtSecond)
    : null;
  const requestedAtThirdIso = input.requestedAtThird.trim()
    ? datetimeLocalToIso(input.requestedAtThird)
    : null;

  if (!requestedAtIso) {
    return { success: false, error: VISIT_SUBMIT_ERROR_MESSAGE };
  }

  const normalizedMessage = normalizeVisitRequestMessage(input.message);

  try {
    const { visitId } = await requestVisitViaRpc({
      inquiryId: inquiry.id,
      requestedAt: requestedAtIso,
      requestedAtSecond: requestedAtSecondIso,
      requestedAtThird: requestedAtThirdIso,
      message: normalizedMessage,
    });

    return { success: true, visitId };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("requestVisitAction failed", error);
    }

    const rpcMessage =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : undefined;

    const mappedError = mapRequestVisitRpcError(rpcMessage);

    if (
      mappedError === VISIT_ALREADY_EXISTS_MESSAGE ||
      mappedError === VISIT_INQUIRY_NOT_ELIGIBLE_MESSAGE
    ) {
      try {
        const visitId = await getVisitIdByInquiryId(inquiry.id);

        if (visitId) {
          return {
            success: false,
            error: VISIT_ALREADY_EXISTS_MESSAGE,
            redirectTo: getBuyerVisitDetailPath(visitId),
          };
        }
      } catch {
        // fall through
      }
    }

    return { success: false, error: mappedError };
  }
}

export async function cancelVisitAction(input: {
  visitId: string;
  cancellationReason: string;
}): Promise<CancelVisitActionResult> {
  const normalizedVisitId = input.visitId.trim();

  if (!isValidInquiryId(normalizedVisitId)) {
    return { success: false, error: VISIT_CANNOT_CANCEL_MESSAGE };
  }

  const reasonErrors = validateCancellationReason(input.cancellationReason);

  if (reasonErrors.cancellationReason) {
    return {
      success: false,
      error: reasonErrors.cancellationReason,
      fieldErrors: reasonErrors,
    };
  }

  const buyerContext = await resolveBuyerContextForVisit();

  if (!buyerContext.success) {
    return { success: false, error: buyerContext.error };
  }

  const visit = await getVisitByIdForBuyer(normalizedVisitId, buyerContext.buyerId);

  if (!visit) {
    return { success: false, error: VISIT_CANNOT_CANCEL_MESSAGE };
  }

  if (!canBuyerCancelVisit(visit.status)) {
    return { success: false, error: VISIT_CANNOT_CANCEL_MESSAGE };
  }

  const normalizedReason = input.cancellationReason.trim();

  try {
    await cancelVisitViaRpc({
      visitId: visit.id,
      cancellationReason: normalizedReason || null,
    });

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("cancelVisitAction failed", error);
    }

    const rpcMessage =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : undefined;

    return { success: false, error: mapCancelVisitRpcError(rpcMessage) };
  }
}

type ResolvedBreederContext =
  { success: true; breederId: string } | { success: false; error: string };

async function resolveBreederContextForVisit(): Promise<ResolvedBreederContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: VISIT_BREEDER_UNAUTHORIZED_MESSAGE };
  }

  if (isAdminUser(user)) {
    return { success: false, error: VISIT_BREEDER_FORBIDDEN_ROLE_MESSAGE };
  }

  const role = parseMemberUserRole(user);

  if (role !== "breeder") {
    return { success: false, error: VISIT_BREEDER_FORBIDDEN_ROLE_MESSAGE };
  }

  const breederId = await getBreederIdByUserId(user.id);

  if (!breederId) {
    return { success: false, error: VISIT_BREEDER_NOT_FOUND_MESSAGE };
  }

  return { success: true, breederId };
}

export async function scheduleVisitAction(
  input: ScheduleVisitFormInput,
): Promise<ScheduleVisitActionResult> {
  const normalizedVisitId = input.visitId.trim();

  if (!isValidInquiryId(normalizedVisitId)) {
    return { success: false, error: VISIT_CANNOT_SCHEDULE_MESSAGE };
  }

  const fieldErrors = validateScheduleVisitForm(input);

  if (Object.keys(fieldErrors).length > 0) {
    const firstError = fieldErrors.scheduledAt ?? VISIT_SCHEDULE_ERROR_MESSAGE;

    return {
      success: false,
      error: firstError,
      fieldErrors,
    };
  }

  const breederContext = await resolveBreederContextForVisit();

  if (!breederContext.success) {
    return { success: false, error: breederContext.error };
  }

  const visit = await getVisitByIdForBreeder(normalizedVisitId, breederContext.breederId);

  if (!visit) {
    return { success: false, error: VISIT_CANNOT_SCHEDULE_MESSAGE };
  }

  if (!canBreederScheduleVisit(visit.status)) {
    return { success: false, error: VISIT_CANNOT_SCHEDULE_MESSAGE };
  }

  const scheduledAtIso = datetimeLocalToIso(input.scheduledAt);

  if (!scheduledAtIso) {
    return {
      success: false,
      error: VISIT_SCHEDULE_DATETIME_REQUIRED_MESSAGE,
      fieldErrors: { scheduledAt: VISIT_SCHEDULE_DATETIME_REQUIRED_MESSAGE },
    };
  }

  try {
    await scheduleVisitViaRpc({
      visitId: visit.id,
      scheduledAt: scheduledAtIso,
    });

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("scheduleVisitAction failed", error);
    }

    const rpcMessage =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : undefined;

    return { success: false, error: mapScheduleVisitRpcError(rpcMessage) };
  }
}

export async function completeVisitAction(
  input: CompleteVisitFormInput,
): Promise<CompleteVisitActionResult> {
  const normalizedVisitId = input.visitId.trim();

  if (!isValidInquiryId(normalizedVisitId)) {
    return { success: false, error: VISIT_CANNOT_COMPLETE_MESSAGE };
  }

  const fieldErrors = validateCompleteVisitForm(input);

  if (hasCompleteVisitValidationErrors(fieldErrors)) {
    const firstError =
      fieldErrors.animalConfirmed ??
      fieldErrors.explanationCompleted ??
      fieldErrors.result ??
      VISIT_COMPLETE_ERROR_MESSAGE;

    return {
      success: false,
      error: firstError,
      fieldErrors,
    };
  }

  const breederContext = await resolveBreederContextForVisit();

  if (!breederContext.success) {
    return { success: false, error: breederContext.error };
  }

  const visit = await getVisitByIdForBreeder(normalizedVisitId, breederContext.breederId);

  if (!visit) {
    return { success: false, error: VISIT_CANNOT_COMPLETE_MESSAGE };
  }

  if (!canBreederCompleteVisit(visit.status)) {
    return { success: false, error: VISIT_CANNOT_COMPLETE_MESSAGE };
  }

  try {
    await completeVisitViaRpc({
      visitId: visit.id,
      animalConfirmed: input.animalConfirmed,
      explanationCompleted: input.explanationCompleted,
      result: input.result.trim(),
    });

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("completeVisitAction failed", error);
    }

    const rpcMessage =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : undefined;

    return { success: false, error: mapCompleteVisitRpcError(rpcMessage) };
  }
}

export async function cancelVisitActionForBreeder(input: {
  visitId: string;
  cancellationReason: string;
}): Promise<CancelVisitActionResult> {
  const normalizedVisitId = input.visitId.trim();

  if (!isValidInquiryId(normalizedVisitId)) {
    return { success: false, error: VISIT_CANNOT_CANCEL_MESSAGE };
  }

  const reasonErrors = validateCancellationReason(input.cancellationReason);

  if (reasonErrors.cancellationReason) {
    return {
      success: false,
      error: reasonErrors.cancellationReason,
      fieldErrors: reasonErrors,
    };
  }

  const breederContext = await resolveBreederContextForVisit();

  if (!breederContext.success) {
    return { success: false, error: breederContext.error };
  }

  const visit = await getVisitByIdForBreeder(normalizedVisitId, breederContext.breederId);

  if (!visit) {
    return { success: false, error: VISIT_CANNOT_CANCEL_MESSAGE };
  }

  if (!canBreederCancelVisit(visit.status)) {
    return { success: false, error: VISIT_CANNOT_CANCEL_MESSAGE };
  }

  const normalizedReason = input.cancellationReason.trim();

  try {
    await cancelVisitViaRpc({
      visitId: visit.id,
      cancellationReason: normalizedReason || null,
    });

    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("cancelVisitActionForBreeder failed", error);
    }

    const rpcMessage =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: string }).message)
        : undefined;

    return { success: false, error: mapCancelVisitRpcError(rpcMessage) };
  }
}

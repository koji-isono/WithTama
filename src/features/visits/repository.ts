import "server-only";

import { createClient } from "@/lib/supabase/server";

import { VISIT_LIST_MAX_ITEMS } from "./constants";
import type { VisitRow } from "./types";

const visitSelect =
  "id, inquiry_id, buyer_id, breeder_id, pet_id, requested_at, requested_at_second, requested_at_third, scheduled_at, status, animal_confirmed, explanation_completed, result, completed_at, canceled_at, cancellation_reason, breeder_note, created_at, deleted_at";

export async function getVisitIdByInquiryId(inquiryId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("visits")
    .select("id")
    .eq("inquiry_id", inquiryId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.id as string | undefined) ?? null;
}

export async function requestVisitViaRpc(input: {
  inquiryId: string;
  requestedAt: string;
  requestedAtSecond?: string | null;
  requestedAtThird?: string | null;
  message: string;
}): Promise<{ visitId: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("request_visit", {
    p_inquiry_id: input.inquiryId,
    p_requested_at: input.requestedAt,
    p_requested_at_second: input.requestedAtSecond ?? undefined,
    p_requested_at_third: input.requestedAtThird ?? undefined,
    p_message: input.message,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("request_visit returned no visit id");
  }

  return { visitId: data as string };
}

export async function getVisitByIdForBuyer(
  visitId: string,
  buyerId: string,
): Promise<VisitRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("visits")
    .select(visitSelect)
    .eq("id", visitId)
    .eq("buyer_id", buyerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as VisitRow | null) ?? null;
}

export async function getVisitByIdForBreeder(
  visitId: string,
  breederId: string,
): Promise<VisitRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("visits")
    .select(visitSelect)
    .eq("id", visitId)
    .eq("breeder_id", breederId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as VisitRow | null) ?? null;
}

export async function scheduleVisitViaRpc(input: {
  visitId: string;
  scheduledAt: string;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("schedule_visit", {
    p_visit_id: input.visitId,
    p_scheduled_at: input.scheduledAt,
  });

  if (error) {
    throw error;
  }
}

export async function completeVisitViaRpc(input: {
  visitId: string;
  animalConfirmed: boolean;
  explanationCompleted: boolean;
  result: string;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("complete_visit", {
    p_visit_id: input.visitId,
    p_animal_confirmed: input.animalConfirmed,
    p_explanation_completed: input.explanationCompleted,
    p_result: input.result,
  });

  if (error) {
    throw error;
  }
}

export async function cancelVisitViaRpc(input: {
  visitId: string;
  cancellationReason?: string | null;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_visit", {
    p_visit_id: input.visitId,
    p_cancellation_reason: input.cancellationReason ?? undefined,
  });

  if (error) {
    throw error;
  }
}

export async function findVisitRequestMessage(
  inquiryId: string,
  visitCreatedAt: string,
): Promise<string | null> {
  const supabase = await createClient();
  const visitTime = new Date(visitCreatedAt).getTime();

  const { data, error } = await supabase
    .from("inquiry_messages")
    .select("message, created_at, sender_type")
    .eq("inquiry_id", inquiryId)
    .eq("sender_type", "buyer")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  const matched = (data ?? []).find((row) => {
    const createdAt = new Date(String(row.created_at)).getTime();
    return Math.abs(createdAt - visitTime) <= 60_000;
  });

  return matched?.message ? String(matched.message) : null;
}

export async function listVisitsForBuyer(
  buyerId: string,
  limit = VISIT_LIST_MAX_ITEMS,
): Promise<VisitRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("visits")
    .select(visitSelect)
    .eq("buyer_id", buyerId)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("requested_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as VisitRow[];
}

export async function listVisitsForBreeder(
  breederId: string,
  limit = VISIT_LIST_MAX_ITEMS,
): Promise<VisitRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("visits")
    .select(visitSelect)
    .eq("breeder_id", breederId)
    .is("deleted_at", null)
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as VisitRow[];
}

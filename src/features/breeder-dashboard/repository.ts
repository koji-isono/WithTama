import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { BreederReviewSummaryRow } from "./types";

const breederReviewSummarySelect = "id, review_status";

export async function getBreederReviewSummaryByUserId(
  userId: string,
): Promise<BreederReviewSummaryRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(breederReviewSummarySelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as BreederReviewSummaryRow | null;
}

export async function getLatestReturnedComment(): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeder_review_logs")
    .select("comment")
    .eq("action", "returned")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.comment ?? null;
}

import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { BreederBillingDisplayRow, BreederBillingRow } from "./types";

const breederBillingSelect = "id, review_status, membership_status, stripe_customer_id";

const breederBillingDisplaySelect =
  "membership_status, subscription_status, subscription_current_period_end, cancel_at_period_end, review_status";

export async function getBreederBillingRowByUserId(
  userId: string,
): Promise<BreederBillingRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(breederBillingSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederBillingRow;
}

export async function getBreederBillingDisplayByUserId(
  userId: string,
): Promise<BreederBillingDisplayRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(breederBillingDisplaySelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    membership_status: data.membership_status,
    subscription_status: data.subscription_status ?? null,
    subscription_current_period_end: data.subscription_current_period_end ?? null,
    cancel_at_period_end: Boolean(data.cancel_at_period_end),
    review_status: data.review_status,
  };
}

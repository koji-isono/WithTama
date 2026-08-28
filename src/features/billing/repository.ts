import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { BreederBillingRow } from "./types";

const breederBillingSelect = "id, review_status, membership_status, stripe_customer_id";

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

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

import { emailLocalPart, type BreederRow, type BuyerRow } from "./types";

function getSupabase() {
  return createClient();
}

const buyerSelect =
  "id, user_id, display_name, membership_status, notification_enabled, profile_completed";

const breederSelect =
  "id, user_id, business_name, representative_name, review_status, membership_status, subscription_status, profile_completed";

export async function getBuyerByUserId(userId: string): Promise<BuyerRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("buyers")
    .select(buyerSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createBuyer(user: User): Promise<BuyerRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("buyers")
    .insert({
      user_id: user.id,
      display_name: emailLocalPart(user.email),
    })
    .select(buyerSelect)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getBreederByUserId(userId: string): Promise<BreederRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("breeders")
    .select(breederSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createBreeder(user: User): Promise<BreederRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("breeders")
    .insert({
      user_id: user.id,
    })
    .select(breederSelect)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

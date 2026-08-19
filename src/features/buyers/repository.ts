import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { BuyerProfileRow, UpdateBuyerProfileData } from "./types";

const buyerProfileSelect =
  "id, user_id, display_name, full_name, phone, prefecture, city, profile_text, preferred_species, preferred_breed, notification_enabled, profile_completed";

export async function getBuyerProfileByUserId(userId: string): Promise<BuyerProfileRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("buyers")
    .select(buyerProfileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as BuyerProfileRow | null;
}

export async function updateBuyerProfile(
  userId: string,
  data: UpdateBuyerProfileData,
): Promise<BuyerProfileRow> {
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("buyers")
    .update({
      display_name: data.display_name,
      full_name: data.full_name,
      phone: data.phone,
      prefecture: data.prefecture,
      city: data.city,
      profile_text: data.profile_text,
      preferred_species: data.preferred_species,
      preferred_breed: data.preferred_breed,
      notification_enabled: data.notification_enabled,
      profile_completed: data.profile_completed,
    })
    .eq("user_id", userId)
    .select(buyerProfileSelect)
    .single();

  if (error) {
    throw error;
  }

  return updated as BuyerProfileRow;
}

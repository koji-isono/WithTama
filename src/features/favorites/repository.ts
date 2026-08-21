import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { FavoriteRow } from "./types";

const favoriteSelect = "id, buyer_id, pet_id, created_at";

export async function getFavoriteByBuyerAndPet(
  buyerId: string,
  petId: string,
): Promise<FavoriteRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("favorites")
    .select(favoriteSelect)
    .eq("buyer_id", buyerId)
    .eq("pet_id", petId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as FavoriteRow | null;
}

export async function listFavoritesByBuyerId(buyerId: string): Promise<FavoriteRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("favorites")
    .select(favoriteSelect)
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as FavoriteRow[];
}

export async function insertFavorite(buyerId: string, petId: string): Promise<FavoriteRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("favorites")
    .insert({
      buyer_id: buyerId,
      pet_id: petId,
    })
    .select(favoriteSelect)
    .single();

  if (error) {
    throw error;
  }

  return data as FavoriteRow;
}

export async function deleteFavorite(buyerId: string, petId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("buyer_id", buyerId)
    .eq("pet_id", petId);

  if (error) {
    throw error;
  }
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

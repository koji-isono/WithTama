import { createClient } from "@/lib/supabase/server";
import {
  mapPetRowToListItem,
  type CreatePetInput,
  type FetchPetsResult,
  type PetRow,
} from "@/types/pet";

export async function fetchPets(): Promise<FetchPetsResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .is("deleted_at", null)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  const pets = (data as PetRow[]).map(mapPetRowToListItem);
  return { ok: true, pets };
}

export async function insertPet(input: CreatePetInput): Promise<{ id: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pets")
    .insert({
      management_name: input.managementName,
      public_display_name: input.managementName,
      species: input.species ?? "cat",
      breed: input.breed,
      sex: input.sex,
      birthday: input.birthday,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { id: data.id as string };
}

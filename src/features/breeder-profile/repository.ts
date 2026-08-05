import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { UpdateBasicProfileData } from "./types";

export async function updateBasicProfile(
  userId: string,
  data: UpdateBasicProfileData,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("breeders")
    .update({
      business_name: data.business_name,
      representative_name: data.representative_name,
      phone: data.phone,
      public_email: data.public_email,
      website_url: data.website_url,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

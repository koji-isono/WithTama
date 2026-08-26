import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getLatestReturnedCommentForBreeder(
  breederId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeder_review_logs")
    .select("comment")
    .eq("breeder_id", breederId)
    .eq("action", "returned")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.comment ?? null;
}

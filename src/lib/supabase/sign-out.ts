import { createClient } from "@/lib/supabase/client";

export async function signOut() {
  const supabase = createClient();

  return supabase.auth.signOut();
}

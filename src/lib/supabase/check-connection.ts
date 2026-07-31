import { createClient } from "./server";

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return false;
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
}

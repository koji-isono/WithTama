import { createClient } from "@/lib/supabase/client";

export type SignupRole = "buyer" | "breeder";

export async function signUpWithRole(email: string, password: string, role: SignupRole) {
  const supabase = createClient();

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
      },
    },
  });
}

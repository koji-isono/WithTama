import { createClient } from "@/lib/supabase/client";

import { getSignupEmailRedirectUrl } from "@/lib/supabase/auth-redirect";

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
      emailRedirectTo: getSignupEmailRedirectUrl(),
    },
  });
}

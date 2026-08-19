import { createClient } from "@/lib/supabase/client";

import { getPasswordRecoveryRedirectUrl } from "./auth-redirect";

export async function resetPasswordForEmail(email: string) {
  const supabase = createClient();

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordRecoveryRedirectUrl(),
  });
}

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { resolveAuthConfirmSuccessNext } from "@/lib/auth/auth-callback-next";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=auth_confirm_error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`);
    }

    return NextResponse.redirect(`${origin}/login?error=auth_confirm_error`);
  }

  const next = resolveAuthConfirmSuccessNext(type);

  return NextResponse.redirect(`${origin}${next}`);
}

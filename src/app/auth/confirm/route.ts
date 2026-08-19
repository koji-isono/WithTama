import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  let next = sanitizeNextPath(searchParams.get("next"));

  if (type === "recovery" && next === "/") {
    next = "/reset-password";
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    if (type === "recovery" || next === "/reset-password") {
      return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`);
    }

    return NextResponse.redirect(`${origin}/login?error=auth_confirm_error`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

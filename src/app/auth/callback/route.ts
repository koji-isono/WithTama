import { NextResponse } from "next/server";

import { sanitizeAuthCallbackNext } from "@/lib/auth/auth-callback-next";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeAuthCallbackNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (next === "/reset-password") {
      return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`);
    }

    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

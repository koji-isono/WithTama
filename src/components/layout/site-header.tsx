import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { resolveSiteHeaderNavState } from "@/features/auth/site-header-nav";
import { createClient } from "@/lib/supabase/server";

function SiteHeaderNav({ nav }: { nav: ReturnType<typeof resolveSiteHeaderNavState> }) {
  return (
    <nav className="flex items-center gap-5 text-sm">
      <Link href="/pets">犬猫を探す</Link>

      {nav.kind === "guest" ? (
        <>
          <Link href="/login">ログイン</Link>
          <Link href="/signup" className="rounded-full bg-[var(--primary)] px-4 py-2 text-white">
            無料会員登録
          </Link>
        </>
      ) : null}

      {nav.kind === "buyer" || nav.kind === "breeder" || nav.kind === "admin" ? (
        <>
          <Link href={nav.dashboardHref}>{nav.dashboardLabel}</Link>
          <LogoutButton className="rounded-full px-3" />
        </>
      ) : null}

      {nav.kind === "authenticated-unknown" ? <LogoutButton className="rounded-full px-3" /> : null}
    </nav>
  );
}

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nav = resolveSiteHeaderNavState(user ?? null);

  return (
    <header className="border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold">
          WithTama
        </Link>
        <SiteHeaderNav nav={nav} />
      </div>
    </header>
  );
}

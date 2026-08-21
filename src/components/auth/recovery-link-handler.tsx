"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const AUTH_ROUTE_PREFIXES = ["/auth/", "/reset-password", "/forgot-password", "/login", "/signup"];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function hasRecoveryHash(hash: string): boolean {
  if (!hash.startsWith("#")) {
    return false;
  }

  const hashParams = new URLSearchParams(hash.slice(1));
  return hashParams.get("type") === "recovery";
}

/**
 * Supabase Recovery メールが Site URL（/）へ hash 付きで着地した場合、
 * サーバーでは hash を読めないため /reset-password へ転送する。
 */
export function RecoveryLinkHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || isAuthRoute(pathname)) {
      return;
    }

    const { hash, search, pathname: currentPath } = window.location;

    if (hasRecoveryHash(hash)) {
      window.location.replace(`/reset-password${hash}`);
      return;
    }

    if (currentPath !== "/") {
      return;
    }

    const params = new URLSearchParams(search);
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (code) {
      const next = type === "recovery" || !type ? "/reset-password" : "/login";
      window.location.replace(
        `/auth/callback?next=${encodeURIComponent(next)}&code=${encodeURIComponent(code)}`,
      );
      return;
    }

    if (tokenHash && type) {
      const next = type === "recovery" ? "/reset-password" : "/login";
      const confirmParams = new URLSearchParams({
        token_hash: tokenHash,
        type,
        next,
      });
      window.location.replace(`/auth/confirm?${confirmParams.toString()}`);
    }
  }, [pathname]);

  return null;
}

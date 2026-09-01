"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { buildAuthLandingRedirectPath } from "@/lib/auth/auth-callback-next";

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
    const authRedirectPath = buildAuthLandingRedirectPath({
      code: params.get("code") ?? undefined,
      token_hash: params.get("token_hash") ?? undefined,
      type: params.get("type") ?? undefined,
    });

    if (authRedirectPath) {
      window.location.replace(authRedirectPath);
    }
  }, [pathname]);

  return null;
}

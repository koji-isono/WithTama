import type { User } from "@supabase/supabase-js";

import { isAdminUser, parseMemberUserRole } from "./types";

export type SiteHeaderNavKind = "guest" | "buyer" | "breeder" | "admin" | "authenticated-unknown";

export type SiteHeaderNavState =
  | { kind: "guest" }
  | { kind: "buyer"; dashboardHref: "/buyer/dashboard"; dashboardLabel: "マイページ" }
  | { kind: "breeder"; dashboardHref: "/breeder/dashboard"; dashboardLabel: "ダッシュボード" }
  | { kind: "admin"; dashboardHref: "/admin"; dashboardLabel: "管理画面" }
  | { kind: "authenticated-unknown" };

/**
 * Resolves public SiteHeader navigation from Supabase Auth user.
 *
 * authenticated-unknown: user is signed in but role cannot be determined.
 * Shows pets + logout only — never guest login/signup links (misleading when session exists).
 */
export function resolveSiteHeaderNavState(user: User | null): SiteHeaderNavState {
  if (!user) {
    return { kind: "guest" };
  }

  if (isAdminUser(user)) {
    return { kind: "admin", dashboardHref: "/admin", dashboardLabel: "管理画面" };
  }

  const memberRole = parseMemberUserRole(user);

  if (memberRole === "buyer") {
    return { kind: "buyer", dashboardHref: "/buyer/dashboard", dashboardLabel: "マイページ" };
  }

  if (memberRole === "breeder") {
    return {
      kind: "breeder",
      dashboardHref: "/breeder/dashboard",
      dashboardLabel: "ダッシュボード",
    };
  }

  return { kind: "authenticated-unknown" };
}

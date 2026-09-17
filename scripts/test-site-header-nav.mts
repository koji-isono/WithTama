/**
 * SiteHeader navigation state verification (pure resolver + static checks).
 *
 * Usage:
 *   npm run test:site-header-nav
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { User } from "@supabase/supabase-js";

import { resolveSiteHeaderNavState } from "@/features/auth/site-header-nav";

type Check = { name: string; passed: boolean; detail?: string };

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function mockUser(partial: Partial<User>): User {
  return partial as User;
}

function main(): void {
  const checks: Check[] = [];

  record(checks, "N1. null user → guest", resolveSiteHeaderNavState(null).kind === "guest");

  record(
    checks,
    "N2. buyer → マイページ /buyer/dashboard",
    (() => {
      const nav = resolveSiteHeaderNavState(
        mockUser({ user_metadata: { role: "buyer" }, app_metadata: {} }),
      );
      return (
        nav.kind === "buyer" &&
        nav.dashboardHref === "/buyer/dashboard" &&
        nav.dashboardLabel === "マイページ"
      );
    })(),
  );

  record(
    checks,
    "N3. breeder → ダッシュボード /breeder/dashboard",
    (() => {
      const nav = resolveSiteHeaderNavState(
        mockUser({ user_metadata: { role: "breeder" }, app_metadata: {} }),
      );
      return (
        nav.kind === "breeder" &&
        nav.dashboardHref === "/breeder/dashboard" &&
        nav.dashboardLabel === "ダッシュボード"
      );
    })(),
  );

  record(
    checks,
    "N4. admin → 管理画面 /admin",
    (() => {
      const nav = resolveSiteHeaderNavState(
        mockUser({ user_metadata: { role: "buyer" }, app_metadata: { role: "admin" } }),
      );
      return (
        nav.kind === "admin" && nav.dashboardHref === "/admin" && nav.dashboardLabel === "管理画面"
      );
    })(),
  );

  record(
    checks,
    "N5. authenticated unknown role → authenticated-unknown (not guest)",
    (() => {
      const nav = resolveSiteHeaderNavState(
        mockUser({ id: "user-1", user_metadata: {}, app_metadata: {} }),
      );
      return nav.kind === "authenticated-unknown";
    })(),
  );

  record(
    checks,
    "N6. invalid role string → authenticated-unknown",
    resolveSiteHeaderNavState(
      mockUser({ id: "user-2", user_metadata: { role: "staff" }, app_metadata: {} }),
    ).kind === "authenticated-unknown",
  );

  const siteHeader = read("src/components/layout/site-header.tsx");
  const siteHeaderNav = read("src/features/auth/site-header-nav.ts");

  record(
    checks,
    "S1. SiteHeader is async Server Component",
    siteHeader.includes("export async function SiteHeader"),
  );
  record(
    checks,
    "S2. uses createClient + auth.getUser",
    siteHeader.includes("createClient") && siteHeader.includes("auth.getUser"),
  );
  record(
    checks,
    "S3. reuses resolveSiteHeaderNavState",
    siteHeader.includes("resolveSiteHeaderNavState"),
  );
  record(checks, "S4. reuses LogoutButton", siteHeader.includes("LogoutButton"));
  record(
    checks,
    "S5. guest shows login + signup",
    siteHeader.includes('href="/login"') && siteHeader.includes('href="/signup"'),
  );
  record(
    checks,
    "S6. resolver reuses isAdminUser + parseMemberUserRole",
    siteHeaderNav.includes("isAdminUser") && siteHeaderNav.includes("parseMemberUserRole"),
  );
  record(
    checks,
    "S7. authenticated-unknown shows logout only (no login/signup branch)",
    siteHeader.includes('"authenticated-unknown"') &&
      siteHeader.includes('nav.kind === "authenticated-unknown"'),
  );

  const buyerPages = [
    "src/app/(buyer)/buyer/dashboard/page.tsx",
    "src/app/(buyer)/buyer/profile/page.tsx",
    "src/app/(buyer)/buyer/favorites/page.tsx",
    "src/app/(buyer)/buyer/inquiries/page.tsx",
    "src/app/(buyer)/buyer/visits/page.tsx",
  ];

  for (const page of buyerPages) {
    record(checks, `B. ${page} still uses SiteHeader`, read(page).includes("SiteHeader"));
  }

  record(
    checks,
    "B. public layout uses SiteHeader",
    read("src/app/(public)/layout.tsx").includes("SiteHeader"),
  );

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;

  console.log("");
  console.log(`${passed} passed / ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();

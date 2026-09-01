/**
 * Breeder layout header actions verification (logout, bell removal, settings nav removal).
 *
 * Usage:
 *   npm run test:breeder-header-actions
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LOGOUT_ERROR_MESSAGE } from "@/components/auth/logout-button";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const ROOT = process.cwd();

const EXPECTED_SIDEBAR_LABELS = [
  "ダッシュボード",
  "犬猫管理",
  "見学管理",
  "問い合わせ",
  "プロフィール",
  "月額会費",
];

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function main(): void {
  const checks: Check[] = [];

  const header = read("src/components/layout/breeder-header.tsx");
  const layout = read("src/app/breeder/layout.tsx");
  const nav = read("src/components/layout/breeder-nav-items.ts");
  const signOutModule = read("src/lib/supabase/sign-out.ts");
  const logoutButton = read("src/components/auth/logout-button.tsx");
  const signInModule = read("src/lib/supabase/sign-in.ts");

  const sidebarSection = nav.split("export const BREEDER_MOBILE_ITEMS")[0] ?? nav;

  record(
    checks,
    "1. sign-out.ts uses browser createClient",
    signOutModule.includes('from "@/lib/supabase/client"') &&
      signOutModule.includes("supabase.auth.signOut()"),
  );

  record(
    checks,
    "2. sign-out.ts does not use service_role",
    !signOutModule.includes("service_role") && !signOutModule.includes("SERVICE_ROLE"),
  );

  record(
    checks,
    "3. LogoutButton imports shared signOut",
    logoutButton.includes('from "@/lib/supabase/sign-out"') &&
      logoutButton.includes("await signOut()"),
  );

  record(
    checks,
    "4. LogoutButton redirects to /login on success",
    logoutButton.includes('router.push("/login")'),
  );

  record(
    checks,
    "5. LogoutButton calls router.refresh after signOut",
    logoutButton.includes("router.refresh()"),
  );

  record(
    checks,
    "6. LogoutButton prevents double click while loading",
    logoutButton.includes("if (loading)") && logoutButton.includes("disabled={loading}"),
  );

  record(
    checks,
    "7. LogoutButton shows generic error on failure",
    logoutButton.includes("LOGOUT_ERROR_MESSAGE") &&
      logoutButton.includes(LOGOUT_ERROR_MESSAGE) &&
      !logoutButton.includes("signOutError.message") &&
      !logoutButton.includes("error.message"),
  );

  record(
    checks,
    "8. LogoutButton does not redirect on signOut failure",
    logoutButton.includes("setLoading(false)") &&
      logoutButton.indexOf('router.push("/login")') > logoutButton.indexOf("if (signOutError)"),
  );

  record(
    checks,
    "9. BreederHeader uses LogoutButton",
    header.includes("LogoutButton") && header.includes('@/components/auth/logout-button"'),
  );

  record(
    checks,
    "10. notification Bell removed from breeder header",
    !header.includes("Bell") &&
      !header.includes('aria-label="通知"') &&
      !header.includes("lucide-react"),
  );

  record(
    checks,
    "11. settings nav removed from sidebar items",
    !sidebarSection.includes('href: "/breeder/settings"') &&
      !sidebarSection.includes('label: "設定"'),
  );

  record(
    checks,
    "12. mobile nav match no longer references /breeder/settings",
    !nav.includes('pathname.startsWith("/breeder/settings")'),
  );

  for (const label of EXPECTED_SIDEBAR_LABELS) {
    record(checks, `13. sidebar keeps nav: ${label}`, sidebarSection.includes(`label: "${label}"`));
  }

  record(
    checks,
    "14. sidebar has exactly six nav routes",
    (sidebarSection.match(/href: "/g) ?? []).length === EXPECTED_SIDEBAR_LABELS.length,
  );

  record(
    checks,
    "15. displayName prop preserved in BreederHeader",
    header.includes("displayName: string") && header.includes("{ displayName }"),
  );

  record(
    checks,
    "16. layout still passes displayName to BreederHeader",
    layout.includes("loadBreederHeaderDisplayName") &&
      layout.includes("<BreederHeader displayName={displayName}"),
  );

  record(
    checks,
    "17. sign-in.ts pattern unchanged (sign-out symmetry)",
    signInModule.includes("createClient") && signInModule.includes("signInWithPassword"),
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

/**
 * BY-02 buyer dashboard page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-dashboard-page
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const ROOT = process.cwd();

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

  const buyerAuth = read("src/features/auth/buyer-auth.ts");
  const buyerLayout = read("src/app/(buyer)/buyer/layout.tsx");
  const dashboardPage = read("src/app/(buyer)/buyer/dashboard/page.tsx");
  const dashboardView = read("src/features/buyers/components/buyer-dashboard-view.tsx");
  const dashboardMenu = read("src/features/buyers/dashboard-menu.ts");
  const loaders = read("src/features/buyers/loaders.ts");
  const profilePage = read("src/app/(buyer)/buyer/profile/page.tsx");

  record(checks, "1. unauthenticated → /login", buyerAuth.includes('redirect("/login")'));
  record(checks, "2. buyer layout uses requireBuyer", buyerLayout.includes("requireBuyer"));
  record(
    checks,
    "3. dashboard page loads dashboard data",
    dashboardPage.includes("loadBuyerDashboardPageData") &&
      dashboardPage.includes("BuyerDashboardView"),
  );
  record(checks, "4. dashboard page uses SiteHeader", dashboardPage.includes("SiteHeader"));
  record(
    checks,
    "5. loader redirects when profile missing or incomplete",
    loaders.includes('redirect("/buyer/profile")') &&
      loaders.includes("!profile || !profile.profile_completed"),
  );
  record(
    checks,
    "6. loader uses getBuyerProfileByUserId with user.id",
    loaders.includes("getBuyerProfileByUserId(user.id)"),
  );
  record(
    checks,
    "7. display_name greeting present",
    dashboardView.includes("{displayName}さん") && dashboardView.includes("BY-02"),
  );
  record(
    checks,
    "8. profile menu links to /buyer/profile",
    dashboardMenu.includes('href: "/buyer/profile"') &&
      dashboardMenu.includes("プロフィールを確認"),
  );
  record(
    checks,
    "9. pets menu links to /pets",
    dashboardMenu.includes('href: "/pets"') && dashboardMenu.includes("犬猫を探す"),
  );
  record(
    checks,
    "10. favorites marked as coming soon",
    dashboardMenu.includes('id: "favorites"') && dashboardMenu.includes("comingSoon: true"),
  );
  record(
    checks,
    "11. inquiries marked as coming soon",
    dashboardMenu.includes('id: "inquiries"') && dashboardMenu.includes("comingSoon: true"),
  );
  record(
    checks,
    "12. visits marked as coming soon",
    dashboardMenu.includes('id: "visits"') && dashboardMenu.includes("comingSoon: true"),
  );
  record(
    checks,
    "13. coming soon badge rendered",
    dashboardView.includes("準備中") && dashboardView.includes("comingSoon"),
  );
  record(
    checks,
    "14. mobile-first single column grid on small screens",
    dashboardView.includes("grid gap-4 sm:grid-cols-2"),
  );
  record(
    checks,
    "15. BY-01 profile page unchanged",
    profilePage.includes("loadBuyerProfilePageData") && profilePage.includes("BuyerProfileForm"),
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
